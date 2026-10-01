import { DocumentError } from './errors.js';
import { cloneBreakpoints, cloneFonts } from '../styles/libraries.js';
import { canonicalizeLayout } from '../styles/layout.js';
import type { FontFamily, IconDefinition } from './schema.js';
import type {
  Binding,
  DocumentFile,
  DocumentSettings,
  DisplayOn,
  EventBinding,
  EventDefinition,
  Expose,
  FieldDefinition,
  FieldValue,
  PreviewData,
  Layout,
  NestedNode,
  StyleBlock,
  TokenInterface,
  VariantAxis,
  VariantPreset,
  VariantRule,
  Repeat,
} from './schema.js';
import { isVariantAxis, isVariantPreset } from './schema.js';
import { canonicalizeStyleBlock, canonicalizeTokenInterface } from '../styles/style-block.js';
import { canonicalizeTokenTree, type TokenTree } from '../token-tree.js';

export interface FlatNodeBase {
  id: string;
  name?: string;
  tag?: string;
  attributes?: Record<string, string>;
  displayOn?: DisplayOn;
  layout?: Layout;
  bindings?: Binding[];
  eventBindings?: EventBinding[];
  style?: Record<string, string>;
}

export interface FrameNode extends FlatNodeBase {
  type: 'frame';
  repeat?: Repeat;
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

/** Instances carry placement plus field, variant, and containing-document style overrides. */
export interface InstanceNode {
  id: string;
  type: 'instance';
  name?: string;
  displayOn?: DisplayOn;
  layout?: Layout;
  component: string;
  fields?: Record<string, FieldValue>;
  fieldBindings?: Record<string, string>;
  variants?: Record<string, string>;
  variantRules?: VariantRule[];
  expose?: Expose;
}

export type FlatNode = FrameNode | TextNode | ImageNode | InstanceNode;

/** In-memory document: one map of nodes, children as ordered id lists. */
export interface FlatDocument {
  version: 1;
  id: string;
  name: string;
  kind: string;
  group?: string;
  rootId: string;
  fields: FieldDefinition[];
  previewData?: PreviewData;
  variantLabels?: Record<string, string>;
  events?: EventDefinition[];
  expose?: Expose;
  variants: VariantAxis[];
  variantPresets?: VariantPreset[];
  settings: DocumentSettings;
  /** DTCG tree. Empty when the file omits tokens. References stay unresolved. */
  tokens: TokenTree;
  fonts: FontFamily[];
  icons?: IconDefinition[];
  /** Component style block: base, variants, states, breakpoints. */
  styles?: StyleBlock;
  /** Tokens this component reads, and tokens it sets for descendants. */
  tokenInterface?: TokenInterface;
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
    ...(file.group ? { group: file.group } : {}),
    rootId,
    fields: file.fields ?? [],
    ...(file.previewData ? { previewData: structuredClone(file.previewData) } : {}),
    ...(file.variantLabels ? { variantLabels: { ...file.variantLabels } } : {}),
    events: file.events ?? [],
    ...(file.expose ? { expose: cloneExpose(file.expose) } : {}),
    variants: (file.variants ?? []).filter(isVariantAxis),
    ...((file.variants ?? []).filter(isVariantPreset).length
      ? { variantPresets: (file.variants ?? []).filter(isVariantPreset).map(clonePreset) }
      : {}),
    settings: file.settings ?? {},
    tokens: (file.tokens ?? {}) as TokenTree,
    fonts: file.fonts ?? [],
    ...(file.icons?.length ? { icons: file.icons } : {}),
    ...(file.styles ? { styles: file.styles } : {}),
    ...(file.tokenInterface ? { tokenInterface: file.tokenInterface } : {}),
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
  if (doc.group) file.group = doc.group;
  if (doc.fields.length) file.fields = doc.fields;
  if (doc.previewData) file.previewData = structuredClone(doc.previewData);
  if (doc.variantLabels) file.variantLabels = { ...doc.variantLabels };
  if (doc.events?.length) file.events = doc.events;
  if (doc.expose) file.expose = cloneExpose(doc.expose);
  const variants = [...doc.variants, ...(doc.variantPresets ?? [])];
  if (variants.length) file.variants = variants;
  if (doc.settings.artboard || doc.settings.breakpoints?.length) {
    const settings: DocumentSettings = {};
    if (doc.settings.artboard) {
      settings.artboard = {
        width: doc.settings.artboard.width,
        height: doc.settings.artboard.height,
      };
    }
    if (doc.settings.breakpoints?.length) {
      settings.breakpoints = cloneBreakpoints(doc.settings.breakpoints);
    }
    file.settings = settings;
  }
  if (doc.fonts.length) file.fonts = cloneFonts(doc.fonts);
  if (doc.icons?.length) file.icons = doc.icons.map((icon) => ({ ...icon }));
  if (Object.keys(doc.tokens).length) file.tokens = canonicalizeTokenTree(doc.tokens);
  if (doc.styles) file.styles = doc.styles;
  if (doc.tokenInterface) file.tokenInterface = doc.tokenInterface;
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
  if (doc.settings.breakpoints?.length) {
    settings.breakpoints = cloneBreakpoints(doc.settings.breakpoints);
  }
  const styles = canonicalizeStyleBlock(doc.styles);
  const tokenInterface = canonicalizeTokenInterface(doc.tokenInterface);
  return {
    version: 1,
    id: doc.id,
    name: doc.name,
    kind: doc.kind,
    ...(doc.group ? { group: doc.group } : {}),
    rootId: doc.rootId,
    fields: doc.fields.map(cloneField),
    ...(doc.previewData ? { previewData: structuredClone(doc.previewData) } : {}),
    ...(doc.variantLabels ? { variantLabels: { ...doc.variantLabels } } : {}),
    ...(doc.events?.length ? { events: doc.events.map(cloneEvent) } : {}),
    ...(doc.expose ? { expose: cloneExpose(doc.expose) } : {}),
    variants: doc.variants.map(cloneVariant),
    ...((doc.variantPresets?.length ?? 0) > 0
      ? { variantPresets: doc.variantPresets?.map(clonePreset) }
      : {}),
    settings,
    tokens: canonicalizeTokenTree(doc.tokens),
    fonts: cloneFonts(doc.fonts),
    ...(doc.icons?.length ? { icons: doc.icons.map((icon) => ({ ...icon })) } : {}),
    ...(styles ? { styles } : {}),
    ...(tokenInterface ? { tokenInterface } : {}),
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
    nodes[node.id] = makeFlatNode({
      ...sharedFromNested(node),
      type: 'frame',
      ...(node.repeat ? { repeat: { ...node.repeat } } : {}),
      children,
    });
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
    ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
    ...(node.layout ? { layout: node.layout } : {}),
    component: node.component,
    ...(node.fields ? { fields: node.fields } : {}),
    ...(node.fieldBindings ? { fieldBindings: { ...node.fieldBindings } } : {}),
    ...(node.variants ? { variants: node.variants } : {}),
    ...(node.variantRules?.length ? { variantRules: structuredClone(node.variantRules) } : {}),
    ...(node.expose ? { expose: cloneExpose(node.expose) } : {}),
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
      ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
      ...(layout ? { layout } : {}),
      component: node.component,
      ...(fields ? { fields } : {}),
      ...(node.fieldBindings ? { fieldBindings: { ...node.fieldBindings } } : {}),
      ...(variants ? { variants } : {}),
      ...(node.variantRules?.length ? { variantRules: structuredClone(node.variantRules) } : {}),
      ...(node.expose ? { expose: cloneExpose(node.expose) } : {}),
    };
  }
  const base = sharedFlat(node);
  if (node.type === 'frame') {
    return {
      ...base,
      type: 'frame',
      ...(node.repeat ? { repeat: { ...node.repeat } } : {}),
      children: [...node.children],
    };
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
      ? {
          ...shared,
          type: 'frame',
          ...(node.repeat ? { repeat: { ...node.repeat } } : {}),
          children,
        }
      : { ...shared, type: 'frame', ...(node.repeat ? { repeat: { ...node.repeat } } : {}) };
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
      ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
      ...(node.layout ? { layout: { ...node.layout } } : {}),
      component: node.component,
      ...(node.fields ? { fields: { ...node.fields } } : {}),
      ...(node.fieldBindings ? { fieldBindings: { ...node.fieldBindings } } : {}),
      ...(node.variants ? { variants: { ...node.variants } } : {}),
      ...(node.variantRules?.length ? { variantRules: structuredClone(node.variantRules) } : {}),
      ...(node.expose ? { expose: cloneExpose(node.expose) } : {}),
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
    ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
    ...(node.layout ? { layout: node.layout } : {}),
    ...(node.bindings ? { bindings: node.bindings } : {}),
    ...(node.eventBindings ? { eventBindings: cloneEventBindings(node.eventBindings) } : {}),
    ...(node.style ? { style: node.style } : {}),
  };
}

function sharedFlat(node: Exclude<FlatNode, InstanceNode>): FlatNodeBase {
  const base: FlatNodeBase = { id: node.id };
  if (node.name) base.name = node.name;
  if (node.tag) base.tag = node.tag;
  const attributes = sortStringRecord(node.attributes);
  if (attributes) base.attributes = attributes;
  if (node.displayOn) base.displayOn = { ...node.displayOn };
  const layout = cleanLayout(node.layout);
  if (layout) base.layout = layout;
  if (node.bindings?.length) base.bindings = node.bindings.map(cloneBinding);
  if (node.eventBindings?.length) base.eventBindings = cloneEventBindings(node.eventBindings);
  const style = sortStringRecord(node.style);
  if (style) base.style = style;
  return base;
}

function sharedToNested(node: Exclude<FlatNode, InstanceNode>): {
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
  return {
    id: node.id,
    ...(node.name !== undefined ? { name: node.name } : {}),
    ...(node.tag !== undefined ? { tag: node.tag } : {}),
    ...(node.attributes ? { attributes: { ...node.attributes } } : {}),
    ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
    ...(node.layout ? { layout: { ...node.layout } } : {}),
    ...(node.bindings ? { bindings: node.bindings.map(cloneBinding) } : {}),
    ...(node.eventBindings ? { eventBindings: cloneEventBindings(node.eventBindings) } : {}),
    ...(node.style ? { style: { ...node.style } } : {}),
  };
}

function cleanLayout(layout: Layout | undefined): Layout | undefined {
  return canonicalizeLayout(layout);
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

function cloneEventBindings(bindings: EventBinding[]): EventBinding[] {
  return bindings.map((binding) => ({
    event: binding.event,
    name: binding.name,
    ...(binding.payload ? { payload: { ...binding.payload } } : {}),
  }));
}

function cloneField(field: FieldDefinition): FieldDefinition {
  return {
    name: field.name,
    type: field.type,
    ...(field.required !== undefined ? { required: field.required } : {}),
    ...(field.default !== undefined ? { default: field.default } : {}),
    ...(field.options ? { options: [...field.options] } : {}),
    ...(field.items
      ? {
          items: {
            type: field.items.type,
            ...(field.items.options ? { options: [...field.items.options] } : {}),
            ...(field.items.fields ? { fields: field.items.fields.map(cloneField) } : {}),
          },
        }
      : {}),
  };
}

function cloneEvent(event: EventDefinition): EventDefinition {
  return {
    name: event.name,
    ...(event.payload ? { payload: { ...event.payload } } : {}),
  };
}

function cloneExpose(expose: Expose): Expose {
  return {
    ...(expose.fields ? { fields: { ...expose.fields } } : {}),
    ...(expose.events ? { events: { ...expose.events } } : {}),
  };
}

function cloneVariant(variant: VariantAxis): VariantAxis {
  return {
    name: variant.name,
    values: [...variant.values],
    ...(variant.default !== undefined ? { default: variant.default } : {}),
  };
}

function clonePreset(variant: VariantPreset): VariantPreset {
  return {
    name: variant.name,
    ...(variant.overrides
      ? {
          overrides: {
            ...(variant.overrides.fields ? { fields: { ...variant.overrides.fields } } : {}),
            ...(variant.overrides.styles
              ? { styles: structuredClone(variant.overrides.styles) }
              : {}),
            ...(variant.overrides.unsetFields
              ? { unsetFields: [...variant.overrides.unsetFields] }
              : {}),
            ...(variant.overrides.nodes ? { nodes: structuredClone(variant.overrides.nodes) } : {}),
            ...(variant.overrides.removed ? { removed: [...variant.overrides.removed] } : {}),
            ...(variant.overrides.insertions
              ? { insertions: structuredClone(variant.overrides.insertions) }
              : {}),
          },
        }
      : {}),
  };
}
