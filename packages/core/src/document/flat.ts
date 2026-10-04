import { DocumentError } from './errors.js';
import { cloneBreakpoints } from '../controller/style/breakpoints.js';
import { cloneFonts } from '../controller/style/fonts.js';
import { canonicalizeLayout } from '../controller/style/layout.js';
import type {
  Binding,
  DisplayOn,
  DocumentFile,
  DocumentSettings,
  EventBinding,
  Layout,
  NestedNode,
} from '../schema/document.js';
import { isVariantAxis, isVariantPreset } from '../schema/document.js';
import { canonicalizeComponentTokens } from '../controller/style/tokens/component/contract.js';
import {
  canonicalizeStyleBlock,
  canonicalizeTokenInterface,
} from '../controller/style/blocks/contract.js';
import { canonicalizeTokenTree } from '../controller/style/tokens/global/tree.js';
import {
  cloneBinding,
  cloneChildFields,
  cloneEvent,
  cloneEventBindings,
  cloneExpose,
  cloneField,
  clonePreset,
  cloneVariant,
  sortFieldValues,
  sortStringRecord,
} from './flat/flat-clone.js';
import type { FlatDocument, FlatNode, FlatNodeBase, InstanceNode } from './flat/flat-types.js';

export type {
  FlatNodeBase,
  FrameNode,
  TextNode,
  ImageNode,
  InstanceNode,
  FlatNode,
  FlatDocument,
} from './flat/flat-types.js';
export { collectSubtree, findParent, isInsideSubtree } from './flat/flat-tree.js';

export function toFlat(file: DocumentFile) {
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
    tokens: (file.tokens ?? {}) as FlatDocument['tokens'],
    fonts: file.fonts ?? [],
    ...(file.icons?.length ? { icons: file.icons } : {}),
    ...(file.styles ? { styles: file.styles } : {}),
    ...(file.tokenInterface ? { tokenInterface: file.tokenInterface } : {}),
    ...(file.componentTokens ? { componentTokens: file.componentTokens } : {}),
    ...(file.schemaCatalog ? { schemaCatalog: structuredClone(file.schemaCatalog) } : {}),
    ...(file.schemaUse ? { schemaUse: structuredClone(file.schemaUse) } : {}),
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
  if (doc.componentTokens && Object.keys(doc.componentTokens).length) {
    file.componentTokens = doc.componentTokens;
  }
  if (doc.schemaCatalog) file.schemaCatalog = structuredClone(doc.schemaCatalog);
  if (doc.schemaUse) file.schemaUse = structuredClone(doc.schemaUse);
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
  const componentTokens = canonicalizeComponentTokens(doc.componentTokens);
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
    ...(componentTokens ? { componentTokens } : {}),
    ...(doc.schemaCatalog ? { schemaCatalog: structuredClone(doc.schemaCatalog) } : {}),
    ...(doc.schemaUse ? { schemaUse: structuredClone(doc.schemaUse) } : {}),
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
    ...(node.styleName !== undefined ? { styleName: node.styleName } : {}),
    ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
    ...(node.layout ? { layout: node.layout } : {}),
    component: node.component,
    ...(node.fields ? { fields: node.fields } : {}),
    ...(node.childFields ? { childFields: cloneChildFields(node.childFields) } : {}),
    ...(node.forwardFields !== undefined ? { forwardFields: node.forwardFields } : {}),
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
    const childFields = cloneChildFields(node.childFields);
    const variants = sortStringRecord(node.variants);
    const layout = cleanLayout(node.layout);
    return {
      id: node.id,
      type: 'instance',
      ...(node.name ? { name: node.name } : {}),
      ...(node.styleName ? { styleName: node.styleName } : {}),
      ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
      ...(layout ? { layout } : {}),
      component: node.component,
      ...(fields ? { fields } : {}),
      ...(childFields ? { childFields } : {}),
      ...(node.forwardFields !== undefined ? { forwardFields: node.forwardFields } : {}),
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
      ...(node.styleName !== undefined ? { styleName: node.styleName } : {}),
      ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
      ...(node.layout ? { layout: { ...node.layout } } : {}),
      component: node.component,
      ...(node.fields ? { fields: { ...node.fields } } : {}),
      ...(node.childFields ? { childFields: cloneChildFields(node.childFields) } : {}),
      ...(node.forwardFields !== undefined ? { forwardFields: node.forwardFields } : {}),
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
    ...(node.styleName !== undefined ? { styleName: node.styleName } : {}),
    ...(node.tag !== undefined ? { tag: node.tag } : {}),
    ...(node.attributes ? { attributes: node.attributes } : {}),
    ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
    ...(node.layout ? { layout: node.layout } : {}),
    ...(node.bindings ? { bindings: node.bindings } : {}),
    ...(node.eventBindings ? { eventBindings: cloneEventBindings(node.eventBindings) } : {}),
    ...(node.style ? { style: node.style } : {}),
  };
}

function sharedFlat(node: Exclude<FlatNode, InstanceNode>) {
  const base: FlatNodeBase = { id: node.id };
  if (node.name) base.name = node.name;
  if (node.styleName) base.styleName = node.styleName;
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
  styleName?: string;
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
    ...(node.styleName !== undefined ? { styleName: node.styleName } : {}),
    ...(node.tag !== undefined ? { tag: node.tag } : {}),
    ...(node.attributes ? { attributes: { ...node.attributes } } : {}),
    ...(node.displayOn ? { displayOn: { ...node.displayOn } } : {}),
    ...(node.layout ? { layout: { ...node.layout } } : {}),
    ...(node.bindings ? { bindings: node.bindings.map(cloneBinding) } : {}),
    ...(node.eventBindings ? { eventBindings: cloneEventBindings(node.eventBindings) } : {}),
    ...(node.style ? { style: { ...node.style } } : {}),
  };
}

function cleanLayout(layout: Layout | undefined) {
  return canonicalizeLayout(layout);
}
