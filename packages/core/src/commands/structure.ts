import { DocumentError } from '../document/errors.js';
import {
  collectSubtree,
  findParent,
  flattenSubtree,
  isInsideSubtree,
  type FlatDocument,
  type FlatNode,
  type FrameNode,
} from '../document/flat.js';
import { createId } from '../document/ids.js';
import type { Binding, DisplayOn, EventBinding, Layout, NestedNode } from '../document/schema.js';
import {
  assertAttributes,
  assertBindings,
  assertDisplayOn,
  assertChildFields,
  assertEventBindings,
  assertFieldBindings,
  assertLayout,
  assertRepeat,
} from '../validation/assertions.js';
import {
  assertStyleMap,
  pruneStyleBlockNodes,
  rebaseStyleBlockChildPaths,
} from '../styles/style-block.js';
import type { InsertNode, Command, CommandContext } from './types.js';
import { adoptTokenReads } from './token-reads.js';
import {
  ID_PATTERN,
  assertIndex,
  requireFrame,
  requireLayout,
  requireName,
  requireString,
  requireTag,
} from './node-utils.js';

export function insertNode(
  doc: FlatDocument,
  command: Extract<Command, { type: 'insert' }>,
  ctx: CommandContext,
): void {
  const parent = requireFrame(doc, command.parentId);
  const seen = new Set(Object.keys(doc.nodes));
  const nested = materialize(command.node, seen, ctx.createId ?? createId);
  const subtree: Record<string, FlatNode> = {};
  const rootId = flattenSubtree(nested, subtree, new Set(Object.keys(doc.nodes)));
  const index = command.index ?? parent.children.length;
  assertIndex(index, parent.children.length);
  Object.assign(doc.nodes, subtree);
  parent.children.splice(index, 0, rootId);
  adoptTokenReads(doc);
}

export function removeNode(doc: FlatDocument, nodeId: string): void {
  if (nodeId === doc.rootId) {
    throw new DocumentError('nesting', 'The document root cannot be removed');
  }
  const parent = findParent(doc, nodeId);
  if (!parent || !doc.nodes[nodeId]) {
    throw new DocumentError('missing-node', `Node "${nodeId}" is not in the document`);
  }
  const removed = new Set(collectSubtree(doc, nodeId));
  const localInstanceIds = new Set(
    Object.values(doc.nodes)
      .filter((node) => node.type === 'instance')
      .map((node) => node.id),
  );
  for (const id of removed) {
    delete doc.nodes[id];
  }
  parent.children = parent.children.filter((id) => id !== nodeId);
  doc.styles = pruneStyleBlockNodes(doc.styles, removed, localInstanceIds);
  pruneExposeForRemovedNodes(doc, removed);
  pruneVariantPresetNodes(doc, removed);
}

function pruneExposeForRemovedNodes(doc: FlatDocument, removed: ReadonlySet<string>): void {
  if (!doc.expose) return;
  const fields = pruneExposeMap(doc.expose.fields, removed);
  const events = pruneExposeMap(doc.expose.events, removed);
  if (fields || events) {
    doc.expose = {
      ...(fields ? { fields } : {}),
      ...(events ? { events } : {}),
    };
  } else {
    delete doc.expose;
  }
}

function pruneExposeMap(
  map: Record<string, string> | undefined,
  removed: ReadonlySet<string>,
): Record<string, string> | undefined {
  if (!map) return undefined;
  const next: Record<string, string> = {};
  for (const [name, path] of Object.entries(map)) {
    const root = path.split('.')[0] ?? path;
    if (!removed.has(root)) next[name] = path;
  }
  return Object.keys(next).length ? next : undefined;
}

function pruneVariantPresetNodes(doc: FlatDocument, removed: ReadonlySet<string>): void {
  if (!doc.variantPresets?.length) return;
  for (const preset of doc.variantPresets) {
    const nodes = preset.overrides?.nodes;
    if (!nodes) continue;
    for (const id of removed) {
      delete nodes[id];
    }
    if (!Object.keys(nodes).length) delete preset.overrides!.nodes;
    if (preset.overrides && !Object.keys(preset.overrides).length) delete preset.overrides;
  }
}

export function moveNode(doc: FlatDocument, command: Extract<Command, { type: 'move' }>): void {
  if (command.nodeId === doc.rootId) {
    throw new DocumentError('nesting', 'The document root cannot be moved');
  }
  if (!doc.nodes[command.nodeId]) {
    throw new DocumentError('missing-node', `Node "${command.nodeId}" is not in the document`);
  }
  if (
    command.nodeId === command.parentId ||
    isInsideSubtree(doc, command.nodeId, command.parentId)
  ) {
    throw new DocumentError('nesting', `Cannot move "${command.nodeId}" into itself`);
  }
  const from = findParent(doc, command.nodeId);
  if (!from) {
    throw new DocumentError('missing-node', `Node "${command.nodeId}" has no parent`);
  }
  const previousPath = renderedNodePath(doc, command.nodeId);
  const to = requireFrame(doc, command.parentId);
  from.children = from.children.filter((id) => id !== command.nodeId);
  const target = from.id === to.id ? from : to;
  assertIndex(command.index, target.children.length);
  target.children.splice(command.index, 0, command.nodeId);
  rebaseDocumentStylePaths(doc, previousPath, renderedNodePath(doc, command.nodeId));
}

export function wrapNode(
  doc: FlatDocument,
  command: Extract<Command, { type: 'wrap' }>,
  ctx: CommandContext,
): void {
  if (command.nodeId === doc.rootId) {
    throw new DocumentError('nesting', 'The document root cannot be wrapped');
  }
  const node = doc.nodes[command.nodeId];
  const parent = findParent(doc, command.nodeId);
  if (!node || !parent) {
    throw new DocumentError('missing-node', `Node "${command.nodeId}" is not in the document`);
  }
  const previousPath = renderedNodePath(doc, command.nodeId);
  const frameId = command.frameId ?? (ctx.createId ?? createId)();
  if (!ID_PATTERN.test(frameId)) {
    throw new DocumentError('invalid-id', `Invalid id "${frameId}"`);
  }
  if (doc.nodes[frameId]) {
    throw new DocumentError('duplicate-id', `Duplicate id "${frameId}"`);
  }
  const index = parent.children.indexOf(command.nodeId);
  const frame: FrameNode = {
    id: frameId,
    type: 'frame',
    name: 'Frame',
    children: [command.nodeId],
  };
  doc.nodes[frameId] = frame;
  parent.children.splice(index, 1, frameId);
  rebaseDocumentStylePaths(doc, previousPath, renderedNodePath(doc, command.nodeId));
}

function renderedNodePath(doc: FlatDocument, nodeId: string): string {
  const path: string[] = [];
  let current = nodeId;
  while (current !== doc.rootId) {
    path.unshift(current);
    const parent = findParent(doc, current);
    if (!parent) throw new DocumentError('missing-node', `Node "${current}" has no parent`);
    current = parent.id;
  }
  return path.join('/');
}

function rebaseDocumentStylePaths(doc: FlatDocument, fromPath: string, toPath: string): void {
  doc.styles = rebaseStyleBlockChildPaths(doc.styles, fromPath, toPath);
  for (const preset of doc.variantPresets ?? []) {
    const overrides = preset.overrides;
    if (!overrides?.styles) continue;
    overrides.styles = rebaseStyleBlockChildPaths(overrides.styles, fromPath, toPath);
  }
}

function materialize(draft: InsertNode, seen: Set<string>, nextId: () => string): NestedNode {
  const id = draft.id ?? nextId();
  if (!ID_PATTERN.test(id)) {
    throw new DocumentError('invalid-id', `Invalid id "${id}"`);
  }
  if (seen.has(id)) {
    throw new DocumentError('duplicate-id', `Duplicate id "${id}"`);
  }
  seen.add(id);
  if (draft.type === 'frame') {
    const children = (draft.children ?? []).map((child) => materialize(child, seen, nextId));
    return {
      ...elementBase(draft, id),
      type: 'frame',
      ...(draft.repeat ? { repeat: { ...draft.repeat } } : {}),
      ...(children.length ? { children } : {}),
    };
  }
  if (draft.children?.length) {
    throw new DocumentError('nesting', `${draft.type} nodes cannot have children`);
  }
  if (draft.repeat) {
    throw new DocumentError('schema', 'Only frame nodes can repeat');
  }
  if (draft.type === 'text') {
    return {
      ...elementBase(draft, id),
      type: 'text',
      ...(draft.text !== undefined ? { text: requireString(draft.text, 'text') } : {}),
    };
  }
  if (draft.type === 'image') {
    return {
      ...elementBase(draft, id),
      type: 'image',
      ...(draft.src !== undefined ? { src: requireString(draft.src, 'src') } : {}),
      ...(draft.alt !== undefined ? { alt: requireString(draft.alt, 'alt') } : {}),
    };
  }
  if (draft.type !== 'instance') {
    throw new DocumentError('schema', 'Unknown node type');
  }
  if (
    draft.tag ||
    draft.attributes ||
    draft.bindings ||
    draft.eventBindings ||
    draft.fieldBindings ||
    draft.repeat ||
    draft.style ||
    draft.text !== undefined ||
    draft.src !== undefined ||
    draft.alt !== undefined
  ) {
    throw new DocumentError(
      'nesting',
      'Instances can only set name, displayOn, layout, component, fields, childFields, fieldBindings, and variants',
    );
  }
  if (!draft.component || !ID_PATTERN.test(draft.component)) {
    throw new DocumentError('schema', 'Instances require a component id');
  }
  if (draft.displayOn) assertDisplayOn(draft.displayOn);
  if (draft.fieldBindings) assertFieldBindings(draft.fieldBindings);
  if (draft.childFields) assertChildFields(draft.childFields);
  return {
    id,
    type: 'instance',
    ...(draft.name !== undefined ? { name: requireName(draft.name) } : {}),
    ...(draft.displayOn ? { displayOn: { ...draft.displayOn } } : {}),
    ...(draft.layout ? { layout: cleanCommandLayout(draft.layout) } : {}),
    component: draft.component,
    ...(draft.fields && Object.keys(draft.fields).length ? { fields: { ...draft.fields } } : {}),
    ...(draft.childFields && Object.keys(draft.childFields).length
      ? { childFields: structuredClone(draft.childFields) }
      : {}),
    ...(draft.fieldBindings && Object.keys(draft.fieldBindings).length
      ? { fieldBindings: { ...(draft.fieldBindings as Record<string, string>) } }
      : {}),
    ...(draft.variants && Object.keys(draft.variants).length
      ? { variants: { ...draft.variants } }
      : {}),
    ...(draft.variantRules?.length ? { variantRules: structuredClone(draft.variantRules) } : {}),
  };
}

function elementBase(
  draft: InsertNode,
  id: string,
): {
  id: string;
  name?: string;
  tag?: string;
  attributes?: Record<string, string>;
  displayOn?: DisplayOn;
  layout?: Layout;
  bindings?: Binding[];
  eventBindings?: EventBinding[];
  style?: Record<string, string>;
} {
  if (draft.attributes) assertAttributes(draft.attributes);
  if (draft.displayOn) assertDisplayOn(draft.displayOn);
  if (draft.bindings) assertBindings(draft.bindings);
  if (draft.eventBindings) assertEventBindings(draft.eventBindings);
  if (draft.repeat) assertRepeat(draft.repeat);
  if (draft.layout) assertLayout(draft.layout);
  if (draft.style) assertStyleMap(draft.style);
  return {
    id,
    ...(draft.name !== undefined ? { name: requireName(draft.name) } : {}),
    ...(draft.tag !== undefined ? { tag: requireTag(draft.tag) } : {}),
    ...(draft.attributes ? { attributes: { ...draft.attributes } } : {}),
    ...(draft.displayOn ? { displayOn: { ...draft.displayOn } } : {}),
    ...(draft.layout ? { layout: cleanCommandLayout(draft.layout) } : {}),
    ...(draft.bindings?.length
      ? { bindings: draft.bindings.map((binding) => ({ ...binding })) }
      : {}),
    ...(draft.eventBindings?.length
      ? { eventBindings: draft.eventBindings.map((binding) => ({ ...binding })) }
      : {}),
    ...(draft.style && Object.keys(draft.style).length ? { style: { ...draft.style } } : {}),
  };
}

function cleanCommandLayout(layout: Layout): Layout {
  return requireLayout(layout);
}
