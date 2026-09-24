import { DocumentError } from './errors.js';
import type {
  Binding,
  DocumentFile,
  DocumentSettings,
  FieldDefinition,
  FieldValue,
  Layout,
  NestedNode,
  VariantAxis,
} from './schema.js';

export interface FlatNodeBase {
  id: string;
  name?: string;
  tag?: string;
  attributes?: Record<string, string>;
  layout?: Layout;
  bindings?: Binding[];
  style?: Record<string, string>;
}

export interface FrameNode extends FlatNodeBase {
  type: 'frame';
  children: string[];
}

export interface TextNode extends FlatNodeBase {
  type: 'text';
  text?: string;
}

export interface ImageNode extends FlatNodeBase {
  type: 'image';
  src?: string;
  alt?: string;
}

/** Instances carry placement plus field and variant overrides. Nothing else. */
export interface InstanceNode {
  id: string;
  type: 'instance';
  name?: string;
  layout?: Layout;
  component: string;
  fields?: Record<string, FieldValue>;
  variants?: Record<string, string>;
}

export type FlatNode = FrameNode | TextNode | ImageNode | InstanceNode;

/** In-memory document: one map of nodes, children as ordered id lists. */
export interface FlatDocument {
  version: 1;
  id: string;
  name: string;
  kind: string;
  rootId: string;
  fields: FieldDefinition[];
  variants: VariantAxis[];
  settings: DocumentSettings;
  nodes: Record<string, FlatNode>;
}

export function toFlat(file: DocumentFile): FlatDocument {
  const nodes: Record<string, FlatNode> = {};
  const rootId = flattenSubtree(file.root, nodes, new Set());
  return canonicalizeFlat({
    version: 1,
    id: file.id,
    name: file.name,
    kind: file.kind,
    rootId,
    fields: file.fields ?? [],
    variants: file.variants ?? [],
    settings: file.settings ?? {},
    nodes,
  });
}

export function toNested(doc: FlatDocument): DocumentFile {
  const nested = expandNode(doc, doc.rootId, new Set());
  const file: DocumentFile = {
    version: 1,
    id: doc.id,
    name: doc.name,
    kind: doc.kind as DocumentFile['kind'],
    root: nested,
  };
  if (doc.fields.length) file.fields = doc.fields;
  if (doc.variants.length) file.variants = doc.variants;
  if (doc.settings.artboard) file.settings = { artboard: { ...doc.settings.artboard } };
  return file;
}

export function canonicalizeFlat(doc: FlatDocument): FlatDocument {
  const nodes: Record<string, FlatNode> = {};
  for (const id of Object.keys(doc.nodes).sort()) {
    const node = doc.nodes[id];
    if (!node) continue;
    nodes[id] = makeFlatNode(node);
  }
  const settings: DocumentSettings = {};
  if (doc.settings.artboard) {
    settings.artboard = {
      width: doc.settings.artboard.width,
      height: doc.settings.artboard.height,
    };
  }
  return {
    version: 1,
    id: doc.id,
    name: doc.name,
    kind: doc.kind,
    rootId: doc.rootId,
    fields: doc.fields.map(cloneField),
    variants: doc.variants.map(cloneVariant),
    settings,
    nodes,
  };
}

export function flattenSubtree(
  node: NestedNode,
  nodes: Record<string, FlatNode>,
  seen: Set<string>,
): string {
  if (seen.has(node.id) || nodes[node.id]) {
    throw new DocumentError('duplicate-id', `Duplicate id "${node.id}"`);
  }
  seen.add(node.id);
  if (node.type === 'frame') {
    const children = (node.children ?? []).map((child) => flattenSubtree(child, nodes, seen));
    nodes[node.id] = makeFlatNode({ ...sharedFromNested(node), type: 'frame', children });
    return node.id;
  }
  if (node.type === 'text') {
    nodes[node.id] = makeFlatNode({
      ...sharedFromNested(node),
      type: 'text',
      ...(node.text !== undefined ? { text: node.text } : {}),
    });
    return node.id;
  }
  if (node.type === 'image') {
    nodes[node.id] = makeFlatNode({
      ...sharedFromNested(node),
      type: 'image',
      ...(node.src !== undefined ? { src: node.src } : {}),
      ...(node.alt !== undefined ? { alt: node.alt } : {}),
    });
    return node.id;
  }
  nodes[node.id] = makeFlatNode({
    id: node.id,
    type: 'instance',
    ...(node.name !== undefined ? { name: node.name } : {}),
    ...(node.layout ? { layout: node.layout } : {}),
    component: node.component,
    ...(node.fields ? { fields: node.fields } : {}),
    ...(node.variants ? { variants: node.variants } : {}),
  });
  return node.id;
}

export function makeFlatNode(node: FlatNode): FlatNode {
  if (node.type === 'instance') {
    const fields = sortFieldValues(node.fields);
    const variants = sortStringRecord(node.variants);
    const layout = cleanLayout(node.layout);
    return {
      id: node.id,
      type: 'instance',
      ...(node.name ? { name: node.name } : {}),
      ...(layout ? { layout } : {}),
      component: node.component,
      ...(fields ? { fields } : {}),
      ...(variants ? { variants } : {}),
    };
  }
  const base = sharedFlat(node);
  if (node.type === 'frame') {
    return { ...base, type: 'frame', children: [...node.children] };
  }
  if (node.type === 'text') {
    return { ...base, type: 'text', ...(node.text !== undefined ? { text: node.text } : {}) };
  }
  return {
    ...base,
    type: 'image',
    ...(node.src !== undefined ? { src: node.src } : {}),
    ...(node.alt !== undefined ? { alt: node.alt } : {}),
  };
}

export function findParent(doc: FlatDocument, id: string): FrameNode | undefined {
  for (const node of Object.values(doc.nodes)) {
    if (node.type === 'frame' && node.children.includes(id)) return node;
  }
  return undefined;
}

export function collectSubtree(doc: FlatDocument, id: string): string[] {
  const ids: string[] = [];
  const walk = (current: string) => {
    ids.push(current);
    const node = doc.nodes[current];
    if (node?.type === 'frame') {
      for (const child of node.children) walk(child);
    }
  };
  walk(id);
  return ids;
}

export function isInsideSubtree(doc: FlatDocument, ancestorId: string, nodeId: string): boolean {
  if (ancestorId === nodeId) return true;
  const ancestor = doc.nodes[ancestorId];
  if (!ancestor || ancestor.type !== 'frame') return false;
  const stack = [...ancestor.children];
  while (stack.length) {
    const next = stack.pop();
    if (!next) continue;
    if (next === nodeId) return true;
    const node = doc.nodes[next];
    if (node?.type === 'frame') stack.push(...node.children);
  }
  return false;
}

function expandNode(doc: FlatDocument, id: string, stack: Set<string>): NestedNode {
  if (stack.has(id)) {
    throw new DocumentError('cycle', `Cycle at node "${id}"`);
  }
  const node = doc.nodes[id];
  if (!node) {
    throw new DocumentError('missing-node', `Missing node "${id}"`);
  }
  stack.add(id);
  let nested: NestedNode;
  if (node.type === 'frame') {
    const shared = sharedToNested(node);
    const children = node.children.map((childId) => expandNode(doc, childId, stack));
    nested = children.length
      ? { ...shared, type: 'frame', children }
      : { ...shared, type: 'frame' };
  } else if (node.type === 'text') {
    const shared = sharedToNested(node);
    nested = { ...shared, type: 'text', ...(node.text !== undefined ? { text: node.text } : {}) };
  } else if (node.type === 'image') {
    const shared = sharedToNested(node);
    nested = {
      ...shared,
      type: 'image',
      ...(node.src !== undefined ? { src: node.src } : {}),
      ...(node.alt !== undefined ? { alt: node.alt } : {}),
    };
  } else {
    nested = {
      id: node.id,
      type: 'instance',
      ...(node.name !== undefined ? { name: node.name } : {}),
      ...(node.layout ? { layout: { ...node.layout } } : {}),
      component: node.component,
      ...(node.fields ? { fields: { ...node.fields } } : {}),
      ...(node.variants ? { variants: { ...node.variants } } : {}),
    };
  }
  stack.delete(id);
  return nested;
}

function sharedFromNested(node: Exclude<NestedNode, { type: 'instance' }>): FlatNodeBase {
  return {
    id: node.id,
    ...(node.name !== undefined ? { name: node.name } : {}),
    ...(node.tag !== undefined ? { tag: node.tag } : {}),
    ...(node.attributes ? { attributes: node.attributes } : {}),
    ...(node.layout ? { layout: node.layout } : {}),
    ...(node.bindings ? { bindings: node.bindings } : {}),
    ...(node.style ? { style: node.style } : {}),
  };
}

function sharedFlat(node: Exclude<FlatNode, InstanceNode>): FlatNodeBase {
  const base: FlatNodeBase = { id: node.id };
  if (node.name) base.name = node.name;
  if (node.tag) base.tag = node.tag;
  const attributes = sortStringRecord(node.attributes);
  if (attributes) base.attributes = attributes;
  const layout = cleanLayout(node.layout);
  if (layout) base.layout = layout;
  if (node.bindings?.length) base.bindings = node.bindings.map(cloneBinding);
  const style = sortStringRecord(node.style);
  if (style) base.style = style;
  return base;
}

function sharedToNested(node: Exclude<FlatNode, InstanceNode>): {
  id: string;
  name?: string;
  tag?: string;
  attributes?: Record<string, string>;
  layout?: Layout;
  bindings?: Binding[];
  style?: Record<string, string>;
} {
  return {
    id: node.id,
    ...(node.name !== undefined ? { name: node.name } : {}),
    ...(node.tag !== undefined ? { tag: node.tag } : {}),
    ...(node.attributes ? { attributes: { ...node.attributes } } : {}),
    ...(node.layout ? { layout: { ...node.layout } } : {}),
    ...(node.bindings ? { bindings: node.bindings.map(cloneBinding) } : {}),
    ...(node.style ? { style: { ...node.style } } : {}),
  };
}

function cleanLayout(layout: Layout | undefined): Layout | undefined {
  if (!layout) return undefined;
  const next: Layout = {};
  if (layout.position !== undefined) next.position = layout.position;
  if (layout.x !== undefined) next.x = layout.x;
  if (layout.y !== undefined) next.y = layout.y;
  if (layout.width !== undefined) next.width = layout.width;
  if (layout.height !== undefined) next.height = layout.height;
  return Object.keys(next).length ? next : undefined;
}

function sortStringRecord(
  record: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!record) return undefined;
  const keys = Object.keys(record).sort();
  if (!keys.length) return undefined;
  const next: Record<string, string> = {};
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) next[key] = value;
  }
  return Object.keys(next).length ? next : undefined;
}

function sortFieldValues(
  record: Record<string, FieldValue> | undefined,
): Record<string, FieldValue> | undefined {
  if (!record) return undefined;
  const keys = Object.keys(record).sort();
  if (!keys.length) return undefined;
  const next: Record<string, FieldValue> = {};
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined) next[key] = value;
  }
  return Object.keys(next).length ? next : undefined;
}

function cloneBinding(binding: Binding): Binding {
  return {
    field: binding.field,
    target: binding.target,
    ...(binding.name !== undefined ? { name: binding.name } : {}),
  };
}

function cloneField(field: FieldDefinition): FieldDefinition {
  return {
    name: field.name,
    type: field.type,
    ...(field.default !== undefined ? { default: field.default } : {}),
    ...(field.options ? { options: [...field.options] } : {}),
  };
}

function cloneVariant(axis: VariantAxis): VariantAxis {
  return {
    name: axis.name,
    values: [...axis.values],
    ...(axis.default !== undefined ? { default: axis.default } : {}),
  };
}
