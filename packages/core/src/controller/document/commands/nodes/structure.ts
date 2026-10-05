import { DocumentError } from '../../../../document/errors.js';
import {
  collectSubtree,
  findParent,
  flattenSubtree,
  isInsideSubtree,
  type FlatDocument,
  type FlatNode,
  type FrameNode,
} from '../../../../document/flat.js';
import { createId } from '../../../../document/ids.js';
import type {
  Binding,
  DisplayOn,
  EventBinding,
  Layout,
  NestedNode,
} from '../../../../schema/document.js';
import {
  assertAttributes,
  assertBindings,
  assertDisplayOn,
  assertChildFields,
  assertEventBindings,
  assertFieldBindings,
  assertLayout,
  assertRepeat,
} from '../../../validation/assertions.js';
import { structuralCaseSlug } from '../../../validation/structural-nodes.js';
import { assertStyleMap, assertStyleNameAvailable } from '../../../style/blocks/contract.js';
import { pruneStyleBlockNodes, rebaseStyleBlockChildPaths } from '../../../style/blocks/edit.js';
import type { InsertNode, Command, CommandContext } from '../types.js';
import { adoptTokenReads } from '../../../style/references/adopt.js';
import {
  ID_PATTERN,
  assertIndex,
  requireChildrenParent,
  requireLayout,
  requireName,
  requireString,
  requireTag,
} from './utils.js';

export function insertNode(
  doc: FlatDocument,
  command: Extract<Command, { type: 'insert' }>,
  ctx: CommandContext,
) {
  const parent = requireChildrenParent(doc, command.parentId);
  const seen = new Set(Object.keys(doc.nodes));
  const nested = materialize(command.node, seen, ctx.createId ?? createId);
  const subtree: Record<string, FlatNode> = {};
  const rootId = flattenSubtree(nested, subtree, new Set(Object.keys(doc.nodes)));
  for (const node of Object.values(subtree)) {
    if (node.styleName)
      assertStyleNameAvailable(
        { nodes: { ...doc.nodes, ...subtree }, variantPresets: doc.variantPresets },
        node.styleName,
        node.id,
      );
  }
  const index = command.index ?? parent.children.length;
  assertIndex(index, parent.children.length);
  assertInsertAllowed(parent.type, nested.type);
  assertStructuralChildren(parent.type, [
    ...parent.children.map((childId) => doc.nodes[childId]?.type ?? ''),
    nested.type,
  ]);
  Object.assign(doc.nodes, subtree);
  parent.children.splice(index, 0, rootId);
  captureStructuralCases(doc, ctx.schemaResolverContext?.documents);
  adoptTokenReads(doc);
}

export function removeNode(doc: FlatDocument, nodeId: string) {
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

function pruneExposeForRemovedNodes(doc: FlatDocument, removed: ReadonlySet<string>) {
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

function pruneExposeMap(map: Record<string, string> | undefined, removed: ReadonlySet<string>) {
  if (!map) return undefined;
  const next: Record<string, string> = {};
  for (const [name, path] of Object.entries(map)) {
    const root = path.split('.')[0] ?? path;
    if (!removed.has(root)) next[name] = path;
  }
  return Object.keys(next).length ? next : undefined;
}

function pruneVariantPresetNodes(doc: FlatDocument, removed: ReadonlySet<string>) {
  if (!doc.variantPresets?.length) return;
  for (const preset of doc.variantPresets) {
    if (preset.overrides?.styles) {
      preset.overrides.styles = pruneStyleBlockNodes(preset.overrides.styles, removed);
      if (!preset.overrides.styles) delete preset.overrides.styles;
    }
    const nodes = preset.overrides?.nodes;
    if (!nodes) continue;
    for (const id of removed) {
      delete nodes[id];
    }
    if (!Object.keys(nodes).length) delete preset.overrides!.nodes;
    if (preset.overrides && !Object.keys(preset.overrides).length) delete preset.overrides;
  }
}

export function moveNode(
  doc: FlatDocument,
  command: Extract<Command, { type: 'move' }>,
  ctx: CommandContext,
) {
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
  const to = requireChildrenParent(doc, command.parentId);
  assertInsertAllowed(to.type, doc.nodes[command.nodeId]!.type);
  assertStructuralChildren(to.type, [
    ...to.children.filter((id) => id !== command.nodeId).map((id) => doc.nodes[id]?.type ?? ''),
    doc.nodes[command.nodeId]!.type,
  ]);
  from.children = from.children.filter((id) => id !== command.nodeId);
  const target = from.id === to.id ? from : to;
  assertIndex(command.index, target.children.length);
  target.children.splice(command.index, 0, command.nodeId);
  captureStructuralCases(doc, ctx.schemaResolverContext?.documents);
  rebaseDocumentStylePaths(doc, previousPath, renderedNodePath(doc, command.nodeId));
}

export function wrapNode(
  doc: FlatDocument,
  command: Extract<Command, { type: 'wrap' }>,
  ctx: CommandContext,
) {
  if (command.nodeId === doc.rootId) {
    throw new DocumentError('nesting', 'The document root cannot be wrapped');
  }
  const node = doc.nodes[command.nodeId];
  const parent = findParent(doc, command.nodeId);
  if (!node || !parent) {
    throw new DocumentError('missing-node', `Node "${command.nodeId}" is not in the document`);
  }
  if (parent.type === 'repeater' || parent.type === 'switch') {
    throw new DocumentError('nesting', `Cannot wrap an instance inside a ${parent.type}`);
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

function renderedNodePath(doc: FlatDocument, nodeId: string) {
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

function rebaseDocumentStylePaths(doc: FlatDocument, fromPath: string, toPath: string) {
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
  if (draft.forwardFields !== undefined && draft.type !== 'instance') {
    throw new DocumentError('schema', 'Only instances can set forwardFields');
  }
  if (draft.forwardFields !== undefined && typeof draft.forwardFields !== 'boolean') {
    throw new DocumentError('schema', 'forwardFields must be a boolean');
  }
  if (draft.switchCase !== undefined && draft.type !== 'instance') {
    throw new DocumentError('schema', 'Only instances can set switchCase');
  }
  if (draft.switchCase !== undefined && !draft.switchCase.trim()) {
    throw new DocumentError('schema', 'Switch cases must be non-empty strings');
  }
  if (draft.type === 'repeater' || draft.type === 'switch') {
    if (
      draft.styleName !== undefined ||
      draft.tag !== undefined ||
      draft.attributes !== undefined ||
      draft.displayOn !== undefined ||
      draft.layout !== undefined ||
      draft.bindings !== undefined ||
      draft.eventBindings !== undefined ||
      draft.fieldBindings !== undefined ||
      draft.repeat !== undefined ||
      draft.style !== undefined ||
      draft.text !== undefined ||
      draft.src !== undefined ||
      draft.alt !== undefined ||
      draft.component !== undefined ||
      draft.fields !== undefined ||
      draft.childFields !== undefined ||
      draft.variants !== undefined ||
      draft.variantRules !== undefined
    ) {
      throw new DocumentError('schema', `${draft.type} nodes only support name and children`);
    }
    const children = (draft.children ?? []).map((child) => materialize(child, seen, nextId));
    for (const child of children) assertInsertAllowed(draft.type, child.type);
    assertStructuralChildren(
      draft.type,
      children.map((child) => child.type),
    );
    return {
      id,
      type: draft.type,
      ...(draft.name !== undefined ? { name: requireName(draft.name) } : {}),
      ...(children.length ? { children } : {}),
    };
  }
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
    draft.repeat ||
    draft.style ||
    draft.text !== undefined ||
    draft.src !== undefined ||
    draft.alt !== undefined
  ) {
    throw new DocumentError(
      'nesting',
      'Instances can only set name, styleName, displayOn, layout, component, fields, childFields, forwardFields, fieldBindings, and variants',
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
    ...(draft.styleName !== undefined ? { styleName: requireStyleName(draft.styleName) } : {}),
    ...(draft.displayOn ? { displayOn: { ...draft.displayOn } } : {}),
    ...(draft.layout ? { layout: cleanCommandLayout(draft.layout) } : {}),
    component: draft.component,
    ...(draft.fields && Object.keys(draft.fields).length ? { fields: { ...draft.fields } } : {}),
    ...(draft.childFields && Object.keys(draft.childFields).length
      ? { childFields: structuredClone(draft.childFields) }
      : {}),
    ...(draft.forwardFields !== undefined ? { forwardFields: draft.forwardFields } : {}),
    ...(draft.switchCase !== undefined ? { switchCase: draft.switchCase.trim() } : {}),
    ...(draft.fieldBindings && Object.keys(draft.fieldBindings).length
      ? { fieldBindings: { ...(draft.fieldBindings as Record<string, string>) } }
      : {}),
    ...(draft.variants && Object.keys(draft.variants).length
      ? { variants: { ...draft.variants } }
      : {}),
    ...(draft.variantRules?.length ? { variantRules: structuredClone(draft.variantRules) } : {}),
  };
}

function assertInsertAllowed(parentType: string, childType: string) {
  if (parentType === 'switch' && childType !== 'instance') {
    throw new DocumentError('nesting', 'Switch nodes can contain only component instances');
  }
  if (parentType === 'repeater' && childType !== 'instance' && childType !== 'switch') {
    throw new DocumentError('nesting', 'Repeater nodes can contain only instances or a switch');
  }
  if (parentType === 'repeater' && childType === 'switch') {
    // A repeater uses either direct alternatives or one switch that owns them.
    return;
  }
}

function assertStructuralChildren(parentType: string, childTypes: readonly string[]) {
  if (parentType !== 'repeater') return;
  const switches = childTypes.filter((type) => type === 'switch').length;
  if (switches > 1 || (switches === 1 && childTypes.length > 1)) {
    throw new DocumentError(
      'nesting',
      'A repeater accepts direct instance alternatives or one switch containing alternatives',
    );
  }
}

function captureStructuralCases(
  doc: FlatDocument,
  documents?: ReadonlyMap<string, { name: string }>,
) {
  for (const owner of Object.values(doc.nodes)) {
    if (owner.type !== 'repeater' && owner.type !== 'switch') continue;
    const alternatives =
      owner.type === 'switch'
        ? owner.children
        : owner.children.length === 1 && doc.nodes[owner.children[0]!]?.type === 'switch'
          ? (doc.nodes[owner.children[0]!] as Extract<FlatNode, { type: 'switch' }>).children
          : owner.children;
    const instances = alternatives.flatMap((id) => {
      const child = doc.nodes[id];
      return child?.type === 'instance' ? [child] : [];
    });
    const used = new Set<string>();
    for (const instance of instances) {
      const value = instance.switchCase?.trim();
      if (!value) continue;
      if (used.has(value)) {
        throw new DocumentError('schema', `Structural case "${value}" must be unique`);
      }
      used.add(value);
    }
    for (const instance of instances) {
      if (instance.switchCase?.trim()) continue;
      const base = structuralCaseSlug(
        documents?.get(instance.component)?.name ?? instance.component,
      );
      let value = base;
      let suffix = 2;
      while (used.has(value)) value = `${base}-${suffix++}`;
      instance.switchCase = value;
      used.add(value);
    }
  }
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
  styleName?: string;
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
    ...(draft.styleName !== undefined ? { styleName: requireStyleName(draft.styleName) } : {}),
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

function requireStyleName(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)) {
    throw new DocumentError('schema', 'CSS class names must start with a letter or underscore');
  }
  return value;
}

function cleanCommandLayout(layout: Layout) {
  return requireLayout(layout);
}
