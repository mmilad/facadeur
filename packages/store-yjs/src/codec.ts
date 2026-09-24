import { makeFlatNode, type FlatDocument, type FlatNode, type Layout } from '@facadeur/core';
import type {
  Binding,
  DocumentSettings,
  FieldDefinition,
  FieldValue,
  VariantAxis,
} from '@facadeur/core';
import * as Y from 'yjs';

/** Write `next` into the Y.Doc, updating existing maps and child arrays in place. */
export function patchDocument(doc: Y.Doc, next: FlatDocument): void {
  syncMeta(doc.getMap('meta'), next);
  syncSettings(doc.getMap('settings'), next.settings);
  syncFields(doc.getArray<Y.Map<unknown>>('fields'), next.fields);
  syncVariants(doc.getArray<Y.Map<unknown>>('variants'), next.variants);
  syncNodes(doc.getMap<Y.Map<unknown>>('nodes'), next);
}

export function readDocument(doc: Y.Doc): FlatDocument {
  const meta = doc.getMap('meta');
  const nodes: Record<string, FlatNode> = {};
  for (const [id, map] of doc.getMap<Y.Map<unknown>>('nodes').entries()) {
    nodes[id] = readNode(map);
  }
  return {
    version: 1,
    id: stringValue(meta.get('id')),
    name: stringValue(meta.get('name')),
    kind: stringValue(meta.get('kind')),
    rootId: stringValue(meta.get('rootId')),
    fields: readFields(doc.getArray<Y.Map<unknown>>('fields')),
    variants: readVariants(doc.getArray<Y.Map<unknown>>('variants')),
    settings: readSettings(doc.getMap('settings')),
    nodes,
  };
}

export function ensureDocumentMaps(doc: Y.Doc): void {
  doc.getMap('meta');
  doc.getMap('settings');
  doc.getArray('fields');
  doc.getArray('variants');
  doc.getMap('nodes');
  // Reserved for later milestones. Empty until tokens and fonts land.
  doc.getMap('tokens');
  doc.getMap('fonts');
}

function syncMeta(meta: Y.Map<unknown>, doc: FlatDocument): void {
  syncScalar(meta, 'version', doc.version);
  syncScalar(meta, 'id', doc.id);
  syncScalar(meta, 'name', doc.name);
  syncScalar(meta, 'kind', doc.kind);
  syncScalar(meta, 'rootId', doc.rootId);
}

function syncSettings(settings: Y.Map<unknown>, value: DocumentSettings): void {
  if (!value.artboard) {
    settings.delete('artboard');
    return;
  }
  const artboard = ensureMap(settings, 'artboard');
  syncScalar(artboard, 'width', value.artboard.width);
  syncScalar(artboard, 'height', value.artboard.height);
}

function syncFields(list: Y.Array<Y.Map<unknown>>, fields: FieldDefinition[]): void {
  const byName = new Map<string, Y.Map<unknown>>();
  for (const map of list.toArray()) {
    const name = map.get('name');
    if (typeof name === 'string') byName.set(name, map);
  }
  const desired = fields.map((field) => {
    const map = byName.get(field.name) ?? new Y.Map<unknown>();
    writeField(map, field);
    return map;
  });
  reconcile(list, desired);
}

function syncVariants(list: Y.Array<Y.Map<unknown>>, axes: VariantAxis[]): void {
  const byName = new Map<string, Y.Map<unknown>>();
  for (const map of list.toArray()) {
    const name = map.get('name');
    if (typeof name === 'string') byName.set(name, map);
  }
  const desired = axes.map((axis) => {
    const map = byName.get(axis.name) ?? new Y.Map<unknown>();
    writeVariant(map, axis);
    return map;
  });
  reconcile(list, desired);
}

function syncNodes(nodes: Y.Map<Y.Map<unknown>>, doc: FlatDocument): void {
  for (const id of [...nodes.keys()]) {
    if (!doc.nodes[id]) nodes.delete(id);
  }
  for (const [id, node] of Object.entries(doc.nodes)) {
    let map = nodes.get(id);
    if (!map || map.get('type') !== node.type) {
      map = new Y.Map<unknown>();
      nodes.set(id, map);
    }
    writeNode(map, node);
  }
}

function writeField(map: Y.Map<unknown>, field: FieldDefinition): void {
  syncScalar(map, 'name', field.name);
  syncScalar(map, 'type', field.type);
  syncScalar(map, 'default', field.default);
  if (field.options) {
    if (!map.doc || !sameList(map.get('options'), field.options))
      map.set('options', [...field.options]);
  } else if (map.doc && map.has('options')) {
    map.delete('options');
  }
}

function writeVariant(map: Y.Map<unknown>, axis: VariantAxis): void {
  syncScalar(map, 'name', axis.name);
  if (!map.doc || !sameList(map.get('values'), axis.values)) map.set('values', [...axis.values]);
  syncScalar(map, 'default', axis.default);
}

function writeNode(map: Y.Map<unknown>, node: FlatNode): void {
  syncScalar(map, 'id', node.id);
  syncScalar(map, 'type', node.type);
  if (node.type === 'instance') {
    syncScalar(map, 'name', node.name);
    syncLayout(map, node.layout);
    syncScalar(map, 'component', node.component);
    syncValueMap(map, 'fields', node.fields);
    syncStringMap(map, 'variants', node.variants);
    for (const key of [
      'tag',
      'attributes',
      'bindings',
      'style',
      'text',
      'src',
      'alt',
      'children',
    ]) {
      if (map.has(key)) map.delete(key);
    }
    return;
  }

  syncScalar(map, 'name', node.name);
  syncScalar(map, 'tag', node.tag);
  syncStringMap(map, 'attributes', node.attributes);
  syncLayout(map, node.layout);
  syncBindings(map, node.bindings);
  syncStringMap(map, 'style', node.style);
  for (const key of ['component', 'fields', 'variants']) {
    if (map.has(key)) map.delete(key);
  }
  if (node.type === 'frame') {
    syncChildren(map, node.children);
    deleteKeys(map, ['text', 'src', 'alt']);
  } else if (node.type === 'text') {
    syncScalar(map, 'text', node.text);
    deleteKeys(map, ['children', 'src', 'alt']);
  } else {
    syncScalar(map, 'src', node.src);
    syncScalar(map, 'alt', node.alt);
    deleteKeys(map, ['children', 'text']);
  }
}

function readNode(map: Y.Map<unknown>): FlatNode {
  const type = map.get('type');
  const id = stringValue(map.get('id'));
  const name = optionalString(map.get('name'));
  const layout = readLayout(map.get('layout'));
  if (type === 'instance') {
    const fields = readValueMap(map.get('fields'));
    const variants = readStringMap(map.get('variants'));
    return makeFlatNode({
      id,
      type: 'instance',
      ...(name !== undefined ? { name } : {}),
      ...(layout ? { layout } : {}),
      component: stringValue(map.get('component')),
      ...(fields ? { fields } : {}),
      ...(variants ? { variants } : {}),
    });
  }
  const tag = optionalString(map.get('tag'));
  const attributes = readStringMap(map.get('attributes'));
  const bindings = readBindings(map.get('bindings'));
  const style = readStringMap(map.get('style'));
  const shared = {
    id,
    ...(name !== undefined ? { name } : {}),
    ...(tag !== undefined ? { tag } : {}),
    ...(attributes ? { attributes } : {}),
    ...(layout ? { layout } : {}),
    ...(bindings ? { bindings } : {}),
    ...(style ? { style } : {}),
  };
  if (type === 'text') {
    const text = map.get('text');
    return makeFlatNode({
      ...shared,
      type: 'text',
      ...(typeof text === 'string' ? { text } : {}),
    });
  }
  if (type === 'image') {
    const src = map.get('src');
    const alt = map.get('alt');
    return makeFlatNode({
      ...shared,
      type: 'image',
      ...(typeof src === 'string' ? { src } : {}),
      ...(typeof alt === 'string' ? { alt } : {}),
    });
  }
  const children = map.get('children');
  return makeFlatNode({
    ...shared,
    type: 'frame',
    children: children instanceof Y.Array ? children.toArray().map(String) : [],
  });
}

function readFields(list: Y.Array<Y.Map<unknown>>): FieldDefinition[] {
  return list.toArray().map((map) => {
    const options = map.get('options');
    const field: FieldDefinition = {
      name: stringValue(map.get('name')),
      type: map.get('type') as FieldDefinition['type'],
    };
    if (map.has('default')) field.default = map.get('default') as FieldValue;
    if (Array.isArray(options)) field.options = options.map(String);
    return field;
  });
}

function readVariants(list: Y.Array<Y.Map<unknown>>): VariantAxis[] {
  return list.toArray().map((map) => {
    const values = map.get('values');
    const axis: VariantAxis = {
      name: stringValue(map.get('name')),
      values: Array.isArray(values) ? values.map(String) : [],
    };
    if (map.has('default')) axis.default = stringValue(map.get('default'));
    return axis;
  });
}

function readSettings(settings: Y.Map<unknown>): DocumentSettings {
  const artboard = settings.get('artboard');
  if (!(artboard instanceof Y.Map)) return {};
  return {
    artboard: {
      width: numberValue(artboard.get('width')),
      height: numberValue(artboard.get('height')),
    },
  };
}

function syncChildren(map: Y.Map<unknown>, children: string[]): void {
  const list = ensureArray<string>(map, 'children');
  reconcile(list, children);
}

function syncBindings(map: Y.Map<unknown>, bindings: Binding[] | undefined): void {
  if (!bindings?.length) {
    if (map.has('bindings')) map.delete('bindings');
    return;
  }
  const list = ensureArray<Y.Map<unknown>>(map, 'bindings');
  while (list.length > bindings.length) list.delete(list.length - 1, 1);
  for (let index = 0; index < bindings.length; index += 1) {
    const binding = bindings[index];
    if (!binding) continue;
    let item = list.get(index);
    if (!item) {
      item = new Y.Map<unknown>();
      list.insert(index, [item]);
    }
    syncScalar(item, 'field', binding.field);
    syncScalar(item, 'target', binding.target);
    syncScalar(item, 'name', binding.name);
  }
}

function syncLayout(parent: Y.Map<unknown>, layout: Layout | undefined): void {
  if (!layout) {
    if (parent.has('layout')) parent.delete('layout');
    return;
  }
  const map = ensureMap(parent, 'layout');
  syncScalar(map, 'position', layout.position);
  syncScalar(map, 'x', layout.x);
  syncScalar(map, 'y', layout.y);
  syncScalar(map, 'width', layout.width);
  syncScalar(map, 'height', layout.height);
}

function syncStringMap(
  parent: Y.Map<unknown>,
  key: string,
  value: Record<string, string> | undefined,
): void {
  if (!value || Object.keys(value).length === 0) {
    if (parent.has(key)) parent.delete(key);
    return;
  }
  const map = ensureMap(parent, key);
  for (const existing of [...map.keys()]) {
    if (!(existing in value)) map.delete(existing);
  }
  for (const [name, item] of Object.entries(value)) {
    if (map.get(name) !== item) map.set(name, item);
  }
}

function syncValueMap(
  parent: Y.Map<unknown>,
  key: string,
  value: Record<string, FieldValue> | undefined,
): void {
  if (!value || Object.keys(value).length === 0) {
    if (parent.has(key)) parent.delete(key);
    return;
  }
  const map = ensureMap(parent, key);
  for (const existing of [...map.keys()]) {
    if (!(existing in value)) map.delete(existing);
  }
  for (const [name, item] of Object.entries(value)) {
    if (map.get(name) !== item) map.set(name, item);
  }
}

function readLayout(value: unknown): Layout | undefined {
  if (!(value instanceof Y.Map)) return undefined;
  const layout: Layout = {};
  const position = value.get('position');
  if (position === 'auto' || position === 'absolute') layout.position = position;
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const item = value.get(key);
    if (typeof item === 'number') layout[key] = item;
  }
  return Object.keys(layout).length ? layout : undefined;
}

function readStringMap(value: unknown): Record<string, string> | undefined {
  if (!(value instanceof Y.Map)) return undefined;
  const record: Record<string, string> = {};
  for (const [key, item] of value.entries()) {
    if (typeof item === 'string') record[key] = item;
  }
  return Object.keys(record).length ? record : undefined;
}

function readValueMap(value: unknown): Record<string, FieldValue> | undefined {
  if (!(value instanceof Y.Map)) return undefined;
  const record: Record<string, FieldValue> = {};
  for (const [key, item] of value.entries()) {
    if (typeof item === 'string' || typeof item === 'boolean') record[key] = item;
    else if (typeof item === 'number' && Number.isFinite(item)) record[key] = item;
  }
  return Object.keys(record).length ? record : undefined;
}

function readBindings(value: unknown): Binding[] | undefined {
  if (!(value instanceof Y.Array)) return undefined;
  const bindings: Binding[] = [];
  for (const item of value.toArray()) {
    if (!(item instanceof Y.Map)) continue;
    const field = item.get('field');
    const target = item.get('target');
    if (typeof field !== 'string' || !isBindingTarget(target)) continue;
    const binding: Binding = { field, target };
    const name = item.get('name');
    if (typeof name === 'string') binding.name = name;
    bindings.push(binding);
  }
  return bindings.length ? bindings : undefined;
}

function ensureMap(parent: Y.Map<unknown>, key: string): Y.Map<unknown> {
  const current = parent.get(key);
  if (current instanceof Y.Map) return current;
  const created = new Y.Map<unknown>();
  parent.set(key, created);
  return created;
}

function ensureArray<T>(parent: Y.Map<unknown>, key: string): Y.Array<T> {
  const current = parent.get(key);
  if (current instanceof Y.Array) return current as Y.Array<T>;
  const created = new Y.Array<T>();
  parent.set(key, created);
  return created;
}

function syncScalar(map: Y.Map<unknown>, key: string, value: unknown): void {
  // A map is readable only after it has been inserted into the document.
  const integrated = map.doc !== null;
  if (value === undefined) {
    if (integrated && map.has(key)) map.delete(key);
    return;
  }
  if (!integrated || map.get(key) !== value) map.set(key, value);
}

function deleteKeys(map: Y.Map<unknown>, keys: string[]): void {
  for (const key of keys) {
    if (map.has(key)) map.delete(key);
  }
}

/** Turn `current` into `desired` with inserts and deletes on the same Y.Array. */
function reconcile<T>(list: Y.Array<T>, desired: readonly T[]): void {
  const limit = list.length + desired.length + 8;
  for (let guard = 0; guard < limit; guard += 1) {
    const current = list.toArray();
    if (
      current.length === desired.length &&
      current.every((item, index) => item === desired[index])
    ) {
      return;
    }
    let index = 0;
    while (index < current.length && index < desired.length && current[index] === desired[index]) {
      index += 1;
    }
    if (index === current.length) {
      list.insert(index, desired.slice(index));
      return;
    }
    if (index === desired.length) {
      list.delete(index, current.length - index);
      return;
    }
    const wanted = desired[index];
    if (wanted === undefined) return;
    const later = current.indexOf(wanted, index);
    if (later === -1) list.insert(index, [wanted]);
    else list.delete(index, 1);
  }
  throw new Error('Could not reconcile a Y.Array');
}

function sameList(current: unknown, next: readonly string[]): boolean {
  return (
    Array.isArray(current) &&
    current.length === next.length &&
    current.every((item, index) => item === next[index])
  );
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function isBindingTarget(value: unknown): value is Binding['target'] {
  return (
    value === 'text' ||
    value === 'attribute' ||
    value === 'style' ||
    value === 'visible' ||
    value === 'src' ||
    value === 'alt'
  );
}
