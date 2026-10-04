import type {
  Binding,
  DocumentSettings,
  EventBinding,
  EventDefinition,
  FieldDefinition,
  FieldValue,
  FlatDocument,
  FlatNode,
  FontFamily,
  FontSource,
  IconDefinition,
  JsonValue,
  Layout,
  VariantAxis,
} from '@facadeur/core';
import * as Y from 'yjs';
import {
  deleteKeys,
  ensureArray,
  ensureMap,
  reconcile,
  sameList,
  syncJsonArray,
  syncJsonMap,
  syncJsonObject,
  syncScalar,
} from './codec-shared.js';

export function syncMeta(meta: Y.Map<unknown>, doc: FlatDocument): void {
  syncScalar(meta, 'version', doc.version);
  syncScalar(meta, 'id', doc.id);
  syncScalar(meta, 'name', doc.name);
  syncScalar(meta, 'kind', doc.kind);
  syncScalar(meta, 'group', doc.group);
  syncScalar(meta, 'rootId', doc.rootId);
}

export function syncSettings(settings: Y.Map<unknown>, value: DocumentSettings): void {
  if (!value.artboard) {
    if (settings.has('artboard')) settings.delete('artboard');
  } else {
    const artboard = ensureMap(settings, 'artboard');
    syncScalar(artboard, 'width', value.artboard.width);
    syncScalar(artboard, 'height', value.artboard.height);
  }
  syncBreakpoints(settings, value.breakpoints);
}

function syncBreakpoints(
  settings: Y.Map<unknown>,
  breakpoints: DocumentSettings['breakpoints'],
): void {
  if (!breakpoints?.length) {
    if (settings.has('breakpoints')) settings.delete('breakpoints');
    return;
  }
  const current = settings.get('breakpoints');
  if (current instanceof Y.Array && sameBreakpoints(current, breakpoints)) return;
  const list = new Y.Array<Y.Map<unknown>>();
  list.insert(
    0,
    breakpoints.map((breakpoint) => {
      const map = new Y.Map<unknown>();
      map.set('id', breakpoint.id);
      map.set('minWidth', breakpoint.minWidth);
      if (breakpoint.label) map.set('label', breakpoint.label);
      if (breakpoint.enabled === false) map.set('enabled', false);
      return map;
    }),
  );
  settings.set('breakpoints', list);
}

function sameBreakpoints(
  list: Y.Array<unknown>,
  breakpoints: NonNullable<DocumentSettings['breakpoints']>,
): boolean {
  const current = list.toArray();
  if (current.length !== breakpoints.length) return false;
  return current.every((item, index) => {
    if (!(item instanceof Y.Map)) return false;
    const breakpoint = breakpoints[index];
    return (
      breakpoint !== undefined &&
      item.get('id') === breakpoint.id &&
      item.get('minWidth') === breakpoint.minWidth &&
      (item.get('label') ?? undefined) === breakpoint.label &&
      (item.get('enabled') ?? undefined) === breakpoint.enabled
    );
  });
}

export function syncFields(list: Y.Array<Y.Map<unknown>>, fields: FieldDefinition[]): void {
  const byName = new Map<string, Y.Map<unknown>>();
  for (const map of list.toArray()) {
    const name = map.get('name');
    if (typeof name === 'string') byName.set(name, map);
  }
  const desired = fields.map((field) => {
    const map = byName.get(field.name) ?? new Y.Map<unknown>();
    if (!map.doc) list.push([map]);
    writeField(map, field);
    return map;
  });
  reconcile(list, desired);
}

export function syncEvents(list: Y.Array<Y.Map<unknown>>, events: EventDefinition[]): void {
  const byName = new Map<string, Y.Map<unknown>>();
  for (const map of list.toArray()) {
    const name = map.get('name');
    if (typeof name === 'string') byName.set(name, map);
  }
  const desired = events.map((event) => {
    const map = byName.get(event.name) ?? new Y.Map<unknown>();
    if (!map.doc) list.push([map]);
    syncScalar(map, 'name', event.name);
    if (event.payload) {
      syncJsonObject(ensureMap(map, 'payload'), event.payload as Record<string, JsonValue>);
    } else if (map.has('payload')) map.delete('payload');
    return map;
  });
  reconcile(list, desired);
}

export function syncVariants(list: Y.Array<Y.Map<unknown>>, axes: VariantAxis[]): void {
  const byName = new Map<string, Y.Map<unknown>>();
  for (const map of list.toArray()) {
    const name = map.get('name');
    if (typeof name === 'string') byName.set(name, map);
  }
  const desired = axes.map((axis) => {
    const map = byName.get(axis.name) ?? new Y.Map<unknown>();
    if (!map.doc) list.push([map]);
    writeVariant(map, axis);
    return map;
  });
  reconcile(list, desired);
}

export function syncNodes(nodes: Y.Map<Y.Map<unknown>>, doc: FlatDocument): void {
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
  syncScalar(map, 'required', field.required);
  syncScalar(map, 'default', field.default);
  if (field.options) {
    if (!map.doc || !sameList(map.get('options'), field.options))
      map.set('options', [...field.options]);
  } else if (map.doc && map.has('options')) {
    map.delete('options');
  }
  syncJsonMap(map, 'items', field.items as unknown as Record<string, JsonValue> | undefined);
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
    syncScalar(map, 'styleName', node.styleName);
    syncJsonMap(map, 'displayOn', node.displayOn as Record<string, JsonValue> | undefined);
    syncLayout(map, node.layout);
    syncScalar(map, 'component', node.component);
    syncValueMap(map, 'fields', node.fields);
    syncJsonMap(
      map,
      'childFields',
      node.childFields as unknown as Record<string, JsonValue> | undefined,
    );
    syncScalar(map, 'forwardFields', node.forwardFields);
    syncStringMap(map, 'fieldBindings', node.fieldBindings);
    syncStringMap(map, 'variants', node.variants);
    if (node.variantRules?.length)
      syncJsonArray(
        ensureArray<unknown>(map, 'variantRules'),
        node.variantRules as unknown as JsonValue[],
      );
    else map.delete('variantRules');
    syncJsonObject(ensureMap(map, 'expose'), (node.expose ?? {}) as Record<string, JsonValue>);
    for (const key of [
      'tag',
      'attributes',
      'bindings',
      'style',
      'text',
      'src',
      'alt',
      'children',
      'eventBindings',
      'repeat',
    ]) {
      if (map.has(key)) map.delete(key);
    }
    return;
  }

  syncScalar(map, 'name', node.name);
  syncScalar(map, 'styleName', node.styleName);
  syncScalar(map, 'tag', node.tag);
  syncStringMap(map, 'attributes', node.attributes);
  syncJsonMap(map, 'displayOn', node.displayOn as Record<string, JsonValue> | undefined);
  syncLayout(map, node.layout);
  syncBindings(map, node.bindings);
  syncEventBindings(map, node.eventBindings);
  syncStringMap(map, 'style', node.style);
  for (const key of [
    'component',
    'fields',
    'childFields',
    'forwardFields',
    'fieldBindings',
    'variants',
    'variantRules',
    'expose',
  ]) {
    if (map.has(key)) map.delete(key);
  }
  if (node.type === 'frame') {
    syncChildren(map, node.children);
    syncJsonObject(ensureMap(map, 'repeat'), (node.repeat ?? {}) as Record<string, JsonValue>);
    deleteKeys(map, ['text', 'src', 'alt']);
  } else if (node.type === 'text') {
    syncScalar(map, 'text', node.text);
    deleteKeys(map, ['children', 'src', 'alt', 'repeat']);
  } else {
    syncScalar(map, 'src', node.src);
    syncScalar(map, 'alt', node.alt);
    deleteKeys(map, ['children', 'text', 'repeat']);
  }
}

export function syncFonts(fonts: Y.Map<unknown>, list: FontFamily[]): void {
  const ids = new Set(list.map((font) => font.id));
  for (const key of [...fonts.keys()]) {
    if (key !== '$order' && !ids.has(key)) fonts.delete(key);
  }
  for (const font of list) {
    const current = fonts.get(font.id);
    const map = current instanceof Y.Map ? current : new Y.Map<unknown>();
    if (!(current instanceof Y.Map)) fonts.set(font.id, map);
    writeFont(map, font);
  }
  reconcile(
    ensureArray<string>(fonts, '$order'),
    list.map((font) => font.id),
  );
}

export function syncIcons(list: Y.Array<Y.Map<unknown>>, icons: IconDefinition[]): void {
  const byId = new Map<string, Y.Map<unknown>>();
  for (const map of list.toArray()) {
    const id = map.get('id');
    if (typeof id === 'string') byId.set(id, map);
  }
  const desired = icons.map((icon) => {
    const map = byId.get(icon.id) ?? new Y.Map<unknown>();
    syncScalar(map, 'id', icon.id);
    syncScalar(map, 'name', icon.name);
    syncScalar(map, 'src', icon.src);
    syncScalar(map, 'category', icon.category);
    return map;
  });
  reconcile(list, desired);
}

function writeFont(map: Y.Map<unknown>, font: FontFamily): void {
  syncScalar(map, 'id', font.id);
  syncScalar(map, 'family', font.family);
  syncJsonArray(ensureArray<unknown>(map, 'weights'), font.weights);
  if (font.styles?.length) syncJsonArray(ensureArray<unknown>(map, 'styles'), font.styles);
  else if (map.has('styles')) map.delete('styles');
  writeSource(map, font.source);
  syncJsonArray(ensureArray<unknown>(map, 'fallbacks'), font.fallbacks);
}

function writeSource(parent: Y.Map<unknown>, source: FontSource): void {
  const map = ensureMap(parent, 'source');
  syncScalar(map, 'type', source.type);
  if (source.type === 'google') {
    syncScalar(map, 'family', source.family);
    if (map.has('files')) map.delete('files');
    return;
  }
  if (map.has('family')) map.delete('family');
  const files = source.files.map((file) => {
    const item: Record<string, JsonValue> = {
      weight: file.weight,
      style: file.style,
      url: file.url,
    };
    if (file.format !== undefined) item.format = file.format;
    return item;
  });
  syncJsonArray(ensureArray<unknown>(map, 'files'), files);
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
  syncJsonObject(map, layout as unknown as Record<string, JsonValue>);
}

function syncEventBindings(map: Y.Map<unknown>, bindings: EventBinding[] | undefined): void {
  if (!bindings?.length) {
    if (map.has('eventBindings')) map.delete('eventBindings');
    return;
  }
  const list = ensureArray<Y.Map<unknown>>(map, 'eventBindings');
  while (list.length > bindings.length) list.delete(list.length - 1, 1);
  for (let index = 0; index < bindings.length; index += 1) {
    const binding = bindings[index];
    if (!binding) continue;
    let item = list.get(index);
    if (!item) {
      item = new Y.Map<unknown>();
      list.insert(index, [item]);
    }
    syncScalar(item, 'event', binding.event);
    syncScalar(item, 'name', binding.name);
    syncStringMap(item, 'payload', binding.payload);
  }
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
  syncJsonObject(map, value as unknown as Record<string, JsonValue>);
}
