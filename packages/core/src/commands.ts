import { DocumentError } from './errors.js';
import {
  canonicalizeFlat,
  collectSubtree,
  findParent,
  flattenSubtree,
  isInsideSubtree,
  makeFlatNode,
  type FlatDocument,
  type FlatNode,
  type FrameNode,
} from './flat.js';
import { createId, ID_PATTERN, TAG_PATTERN } from './ids.js';
import type { NodeType } from './kinds.js';
import { assertBreakpoints, assertFont, cloneBreakpoints, cloneFont } from './libraries.js';
import type {
  Binding,
  Breakpoint,
  FieldDefinition,
  FieldValue,
  FontFamily,
  Layout,
  NestedNode,
  VariantAxis,
} from './schema.js';
import {
  removeGroupFromTree,
  removeTokenFromTree,
  setGroupInTree,
  setTokenInTree,
  type TokenDefinition,
  type TokenGroupDefinition,
} from './token-tree.js';
import {
  assertAttributes,
  assertBindings,
  assertFieldDefinition,
  assertLayout,
  assertVariantAxis,
  validateDefinitions,
  validateLibraries,
  validateTree,
  type ValidateOptions,
} from './validate.js';

export interface CommandContext extends ValidateOptions {
  createId?: () => string;
}

/** Node passed to `insert`. Ids are assigned when omitted. */
export interface InsertNode {
  id?: string;
  type: NodeType;
  name?: string;
  tag?: string;
  attributes?: Record<string, string>;
  layout?: Layout;
  bindings?: Binding[];
  style?: Record<string, string>;
  text?: string;
  src?: string;
  alt?: string;
  component?: string;
  fields?: Record<string, FieldValue>;
  variants?: Record<string, string>;
  children?: InsertNode[];
}

export type NodeProp =
  'name' | 'tag' | 'text' | 'src' | 'alt' | 'attributes' | 'layout' | 'bindings' | 'component';

export type Command =
  | { type: 'insert'; parentId: string; index?: number; node: InsertNode }
  | { type: 'remove'; nodeId: string }
  | { type: 'move'; nodeId: string; parentId: string; index: number }
  | { type: 'setProp'; nodeId: string; prop: NodeProp; value: unknown }
  | { type: 'setStyle'; nodeId: string; property: string; value: string | null }
  | { type: 'setField'; nodeId: string; field: string; value: FieldValue | null }
  | { type: 'setVariant'; nodeId: string; axis: string; value: string | null }
  | { type: 'defineField'; field: FieldDefinition }
  | { type: 'removeField'; name: string }
  | { type: 'defineVariant'; axis: VariantAxis }
  | { type: 'removeVariant'; name: string }
  | { type: 'setToken'; path: string; token: TokenDefinition }
  | { type: 'removeToken'; path: string }
  | { type: 'setTokenGroup'; path: string; group: TokenGroupDefinition }
  | { type: 'removeTokenGroup'; path: string }
  | { type: 'setFont'; font: FontFamily }
  | { type: 'removeFont'; id: string }
  | { type: 'setBreakpoints'; breakpoints: Breakpoint[] };

const PROPS: Record<NodeType, readonly NodeProp[]> = {
  frame: ['name', 'tag', 'attributes', 'layout', 'bindings'],
  text: ['name', 'tag', 'text', 'attributes', 'layout', 'bindings'],
  image: ['name', 'tag', 'src', 'alt', 'attributes', 'layout', 'bindings'],
  instance: ['name', 'layout', 'component'],
};

const STYLE_PROPERTY = /^(--)?[A-Za-z_][\w-]*$/;

/**
 * Pure command application. The input document is not mutated.
 * `move.index` is the position in the target child list after the node has been
 * removed from its current parent.
 */
export function applyCommand(
  doc: FlatDocument,
  command: Command,
  ctx: CommandContext = {},
): FlatDocument {
  const next = structuredClone(canonicalizeFlat(doc));
  switch (command.type) {
    case 'insert':
      insertNode(next, command, ctx);
      break;
    case 'remove':
      removeNode(next, command.nodeId);
      break;
    case 'move':
      moveNode(next, command);
      break;
    case 'setProp':
      setProp(next, command);
      break;
    case 'setStyle':
      setStyle(next, command);
      break;
    case 'setField':
      setField(next, command);
      break;
    case 'setVariant':
      setVariant(next, command);
      break;
    case 'defineField':
      defineField(next, command.field);
      break;
    case 'removeField':
      removeField(next, command.name);
      break;
    case 'defineVariant':
      defineVariant(next, command.axis);
      break;
    case 'removeVariant':
      removeVariant(next, command.name);
      break;
    case 'setToken':
      next.tokens = setTokenInTree(next.tokens, command.path, command.token);
      break;
    case 'removeToken':
      next.tokens = removeTokenFromTree(next.tokens, command.path);
      break;
    case 'setTokenGroup':
      next.tokens = setGroupInTree(next.tokens, command.path, command.group);
      break;
    case 'removeTokenGroup':
      next.tokens = removeGroupFromTree(next.tokens, command.path);
      break;
    case 'setFont':
      setFont(next, command.font);
      break;
    case 'removeFont':
      removeFont(next, command.id);
      break;
    case 'setBreakpoints':
      setBreakpoints(next, command.breakpoints);
      break;
    default: {
      const unreachable: never = command;
      throw new DocumentError('schema', `Unknown command ${JSON.stringify(unreachable)}`);
    }
  }
  const canonical = canonicalizeFlat(next);
  validateDefinitions(canonical);
  validateLibraries(canonical);
  validateTree(canonical, ctx);
  return canonical;
}

function insertNode(
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
}

function removeNode(doc: FlatDocument, nodeId: string): void {
  if (nodeId === doc.rootId) {
    throw new DocumentError('nesting', 'The document root cannot be removed');
  }
  const parent = findParent(doc, nodeId);
  if (!parent || !doc.nodes[nodeId]) {
    throw new DocumentError('missing-node', `Node "${nodeId}" is not in the document`);
  }
  for (const id of collectSubtree(doc, nodeId)) {
    delete doc.nodes[id];
  }
  parent.children = parent.children.filter((id) => id !== nodeId);
}

function moveNode(doc: FlatDocument, command: Extract<Command, { type: 'move' }>): void {
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
  const to = requireFrame(doc, command.parentId);
  from.children = from.children.filter((id) => id !== command.nodeId);
  const target = from.id === to.id ? from : to;
  assertIndex(command.index, target.children.length);
  target.children.splice(command.index, 0, command.nodeId);
}

function setProp(doc: FlatDocument, command: Extract<Command, { type: 'setProp' }>): void {
  const node = requireNode(doc, command.nodeId);
  if (!PROPS[node.type].includes(command.prop)) {
    throw new DocumentError('schema', `${node.type} nodes have no "${command.prop}" property`);
  }
  if (node.type === 'instance') {
    applyInstanceProp(node, command.prop, command.value);
  } else {
    applyElementProp(node, command.prop, command.value);
  }
  doc.nodes[node.id] = makeFlatNode(node);
}

function setStyle(doc: FlatDocument, command: Extract<Command, { type: 'setStyle' }>): void {
  const node = requireNode(doc, command.nodeId);
  if (node.type === 'instance') {
    throw new DocumentError('nesting', 'Instances cannot carry style overrides');
  }
  if (!STYLE_PROPERTY.test(command.property)) {
    throw new DocumentError('schema', `Invalid style property "${command.property}"`);
  }
  const style = { ...(node.style ?? {}) };
  if (command.value === null) {
    delete style[command.property];
  } else if (typeof command.value === 'string') {
    style[command.property] = command.value;
  } else {
    throw new DocumentError('schema', 'Style values must be strings');
  }
  node.style = style;
  doc.nodes[node.id] = makeFlatNode(node);
}

function setField(doc: FlatDocument, command: Extract<Command, { type: 'setField' }>): void {
  const node = requireNode(doc, command.nodeId);
  if (node.type !== 'instance') {
    throw new DocumentError('schema', 'Only instances can override fields');
  }
  if (!ID_PATTERN.test(command.field)) {
    throw new DocumentError('schema', `Invalid field name "${command.field}"`);
  }
  const fields = { ...(node.fields ?? {}) };
  if (command.value === null) {
    delete fields[command.field];
  } else if (isFieldValue(command.value)) {
    fields[command.field] = command.value;
  } else {
    throw new DocumentError('schema', 'Field values must be a string, number, or boolean');
  }
  node.fields = fields;
  doc.nodes[node.id] = makeFlatNode(node);
}

function setVariant(doc: FlatDocument, command: Extract<Command, { type: 'setVariant' }>): void {
  const node = requireNode(doc, command.nodeId);
  if (node.type !== 'instance') {
    throw new DocumentError('schema', 'Only instances can override variants');
  }
  if (!ID_PATTERN.test(command.axis)) {
    throw new DocumentError('schema', `Invalid variant axis "${command.axis}"`);
  }
  const variants = { ...(node.variants ?? {}) };
  if (command.value === null) {
    delete variants[command.axis];
  } else if (typeof command.value === 'string' && command.value.length > 0) {
    variants[command.axis] = command.value;
  } else {
    throw new DocumentError('schema', 'Variant values must be non-empty strings');
  }
  node.variants = variants;
  doc.nodes[node.id] = makeFlatNode(node);
}

function defineField(doc: FlatDocument, field: FieldDefinition): void {
  assertFieldDefinition(field);
  const index = doc.fields.findIndex((item) => item.name === field.name);
  if (index === -1) doc.fields.push(field);
  else doc.fields[index] = field;
}

function removeField(doc: FlatDocument, name: string): void {
  const index = doc.fields.findIndex((item) => item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-field', `Field "${name}" is not defined`);
  }
  doc.fields.splice(index, 1);
}

function defineVariant(doc: FlatDocument, axis: VariantAxis): void {
  assertVariantAxis(axis);
  const index = doc.variants.findIndex((item) => item.name === axis.name);
  if (index === -1) doc.variants.push(axis);
  else doc.variants[index] = axis;
}

function removeVariant(doc: FlatDocument, name: string): void {
  const index = doc.variants.findIndex((item) => item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-variant', `Variant "${name}" is not defined`);
  }
  doc.variants.splice(index, 1);
}

function setFont(doc: FlatDocument, font: FontFamily): void {
  assertFont(font);
  const next = cloneFont(font);
  const index = doc.fonts.findIndex((item) => item.id === next.id);
  if (index === -1) doc.fonts.push(next);
  else doc.fonts[index] = next;
}

function removeFont(doc: FlatDocument, id: string): void {
  const index = doc.fonts.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new DocumentError('schema', `Font "${id}" is not defined`);
  }
  doc.fonts.splice(index, 1);
}

function setBreakpoints(doc: FlatDocument, breakpoints: Breakpoint[]): void {
  if (!breakpoints.length) {
    delete doc.settings.breakpoints;
    return;
  }
  assertBreakpoints(breakpoints);
  doc.settings.breakpoints = cloneBreakpoints(breakpoints);
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
      ...(children.length ? { children } : {}),
    };
  }
  if (draft.children?.length) {
    throw new DocumentError('nesting', `${draft.type} nodes cannot have children`);
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
    draft.style ||
    draft.text !== undefined ||
    draft.src !== undefined ||
    draft.alt !== undefined
  ) {
    throw new DocumentError(
      'nesting',
      'Instances can only set name, layout, component, fields, and variants',
    );
  }
  if (!draft.component || !ID_PATTERN.test(draft.component)) {
    throw new DocumentError('schema', 'Instances require a component id');
  }
  return {
    id,
    type: 'instance',
    ...(draft.name !== undefined ? { name: requireName(draft.name) } : {}),
    ...(draft.layout ? { layout: cleanCommandLayout(draft.layout) } : {}),
    component: draft.component,
    ...(draft.fields && Object.keys(draft.fields).length ? { fields: { ...draft.fields } } : {}),
    ...(draft.variants && Object.keys(draft.variants).length
      ? { variants: { ...draft.variants } }
      : {}),
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
  layout?: Layout;
  bindings?: Binding[];
  style?: Record<string, string>;
} {
  if (draft.attributes) assertAttributes(draft.attributes);
  if (draft.bindings) assertBindings(draft.bindings);
  if (draft.layout) assertLayout(draft.layout);
  if (draft.style) assertStyleMap(draft.style);
  return {
    id,
    ...(draft.name !== undefined ? { name: requireName(draft.name) } : {}),
    ...(draft.tag !== undefined ? { tag: requireTag(draft.tag) } : {}),
    ...(draft.attributes ? { attributes: { ...draft.attributes } } : {}),
    ...(draft.layout ? { layout: cleanCommandLayout(draft.layout) } : {}),
    ...(draft.bindings?.length
      ? { bindings: draft.bindings.map((binding) => ({ ...binding })) }
      : {}),
    ...(draft.style && Object.keys(draft.style).length ? { style: { ...draft.style } } : {}),
  };
}

function applyElementProp(
  node: Exclude<FlatNode, { type: 'instance' }>,
  prop: NodeProp,
  value: unknown,
): void {
  switch (prop) {
    case 'name':
      assignName(node, value);
      return;
    case 'tag':
      if (value === null) delete node.tag;
      else node.tag = requireTag(value);
      return;
    case 'text':
      if (node.type !== 'text') break;
      if (value === null) delete node.text;
      else node.text = requireString(value, 'text');
      return;
    case 'src':
      if (node.type !== 'image') break;
      if (value === null) delete node.src;
      else node.src = requireString(value, 'src');
      return;
    case 'alt':
      if (node.type !== 'image') break;
      if (value === null) delete node.alt;
      else node.alt = requireString(value, 'alt');
      return;
    case 'attributes':
      if (value === null) delete node.attributes;
      else {
        const attributes = requireStringRecord(value, 'attributes');
        assertAttributes(attributes);
        node.attributes = attributes;
      }
      return;
    case 'layout':
      if (value === null) delete node.layout;
      else node.layout = requireLayout(value);
      return;
    case 'bindings':
      if (value === null) delete node.bindings;
      else {
        const bindings = requireBindings(value);
        assertBindings(bindings);
        node.bindings = bindings;
      }
      return;
    case 'component':
      break;
    default: {
      const unreachable: never = prop;
      throw new DocumentError('schema', `Unknown property ${String(unreachable)}`);
    }
  }
  throw new DocumentError('schema', `${node.type} nodes have no "${prop}" property`);
}

function applyInstanceProp(
  node: Extract<FlatNode, { type: 'instance' }>,
  prop: NodeProp,
  value: unknown,
): void {
  switch (prop) {
    case 'name':
      assignName(node, value);
      return;
    case 'layout':
      if (value === null) delete node.layout;
      else node.layout = requireLayout(value);
      return;
    case 'component':
      if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
        throw new DocumentError('schema', 'Instances require a component id');
      }
      node.component = value;
      return;
    default:
      throw new DocumentError('schema', `Instances have no "${prop}" property`);
  }
}

function assignName(node: { name?: string }, value: unknown): void {
  if (value === null) delete node.name;
  else node.name = requireName(value);
}

function requireNode(doc: FlatDocument, id: string): FlatNode {
  const node = doc.nodes[id];
  if (!node) throw new DocumentError('missing-node', `Node "${id}" is not in the document`);
  return node;
}

function requireFrame(doc: FlatDocument, id: string): FrameNode {
  const node = requireNode(doc, id);
  if (node.type !== 'frame') {
    throw new DocumentError('invalid-parent', `Node "${id}" cannot contain children`);
  }
  return node;
}

function assertIndex(index: number, length: number): void {
  if (!Number.isInteger(index) || index < 0 || index > length) {
    throw new DocumentError('schema', `Index ${index} is outside 0..${length}`);
  }
}

function requireName(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DocumentError('schema', 'Name must be a non-empty string');
  }
  return value;
}

function requireTag(value: unknown): string {
  if (typeof value !== 'string' || !TAG_PATTERN.test(value)) {
    throw new DocumentError('schema', 'Tag must be an HTML tag name');
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new DocumentError('schema', `${label} must be a string`);
  }
  return value;
}

function requireStringRecord(value: unknown, label: string): Record<string, string> {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} must be an object of strings`);
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new DocumentError('schema', `${label}.${key} must be a string`);
    }
    next[key] = item;
  }
  return next;
}

function requireLayout(value: unknown): Layout {
  if (!isRecord(value)) throw new DocumentError('schema', 'Layout must be an object');
  const layout: Layout = {};
  if (value.position !== undefined) {
    if (value.position !== 'auto' && value.position !== 'absolute') {
      throw new DocumentError('schema', 'Layout position must be auto or absolute');
    }
    layout.position = value.position;
  }
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== 'number') {
      throw new DocumentError('schema', `Layout ${key} must be a number`);
    }
    layout[key] = value[key];
  }
  assertLayout(layout);
  return layout;
}

function cleanCommandLayout(layout: Layout): Layout {
  return requireLayout(layout);
}

function requireBindings(value: unknown): Binding[] {
  if (!Array.isArray(value)) throw new DocumentError('schema', 'Bindings must be an array');
  return value.map((item) => {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.target !== 'string') {
      throw new DocumentError('schema', 'Each binding needs a field and a target');
    }
    if (!isBindingTarget(item.target)) {
      throw new DocumentError('schema', `Unknown binding target "${item.target}"`);
    }
    const binding: Binding = { field: item.field, target: item.target };
    if (item.name !== undefined) {
      if (typeof item.name !== 'string' || !item.name) {
        throw new DocumentError('schema', 'Binding name must be a non-empty string');
      }
      binding.name = item.name;
    }
    return binding;
  });
}

function assertStyleMap(style: Record<string, string>): void {
  for (const key of Object.keys(style)) {
    if (!STYLE_PROPERTY.test(key)) {
      throw new DocumentError('schema', `Invalid style property "${key}"`);
    }
  }
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  return typeof value === 'number' && Number.isFinite(value);
}

function isBindingTarget(value: string): value is Binding['target'] {
  return (
    value === 'text' ||
    value === 'attribute' ||
    value === 'style' ||
    value === 'visible' ||
    value === 'src' ||
    value === 'alt'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
