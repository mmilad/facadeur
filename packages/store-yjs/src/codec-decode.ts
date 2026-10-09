import {
  canonicalizeLayout,
  makeFlatNode,
  type Binding,
  type DisplayOn,
  type DocumentSettings,
  type EventBinding,
  type EventDefinition,
  type Expose,
  type FieldDefinition,
  type FieldValue,
  type FlatDocument,
  type FlatNode,
  type IconDefinition,
  type Layout,
  type PreviewData,
  type Repeat,
  type StyleBlock,
  type TokenInterface,
  type VariantAxis,
  type VariantPreset,
  type VariantRule,
} from '@facadeur/core';
import * as Y from 'yjs';
import {
  isBindingTarget,
  isVariantPresetJson,
  numberValue,
  optionalString,
  readJsonArray,
  readJsonObject,
  readStringArray,
  stringValue,
} from './codec-shared';

export function readNode(map: Y.Map<unknown>): FlatNode {
  const type = map.get('type');
  const id = stringValue(map.get('id'));
  const name = optionalString(map.get('name'));
  if (type === 'repeater' || type === 'switch') {
    return makeFlatNode({
      id,
      type,
      ...(name !== undefined ? { name } : {}),
      children: readStringArray(map.get('children')),
    });
  }
  const styleName = optionalString(map.get('styleName'));
  const classes = readStringArray(map.get('classes'));
  const layout = readLayout(map.get('layout'));
  if (type === 'instance') {
    const fields = readValueMap(map.get('fields'));
    const childFields = readChildFields(map.get('childFields'));
    const forwardFields = map.get('forwardFields');
    const switchCase = optionalString(map.get('switchCase'));
    const fieldBindings = readStringMap(map.get('fieldBindings'));
    const variants = readStringMap(map.get('variants'));
    const displayOn = readDisplayOn(map.get('displayOn'));
    const expose = readExposeValue(map.get('expose'));
    return makeFlatNode({
      id,
      type: 'instance',
      ...(name !== undefined ? { name } : {}),
      ...(styleName !== undefined ? { styleName } : {}),
      ...(classes.length ? { classes } : {}),
      ...(displayOn ? { displayOn } : {}),
      ...(layout ? { layout } : {}),
      component: stringValue(map.get('component')),
      ...(fields ? { fields } : {}),
      ...(childFields ? { childFields } : {}),
      ...(typeof forwardFields === 'boolean' ? { forwardFields } : {}),
      ...(switchCase !== undefined ? { switchCase } : {}),
      ...(fieldBindings ? { fieldBindings } : {}),
      ...(variants ? { variants } : {}),
      ...(readJsonArray(map.get('variantRules')).length
        ? { variantRules: readJsonArray(map.get('variantRules')) as unknown as VariantRule[] }
        : {}),
      ...(expose ? { expose } : {}),
    });
  }
  const tag = optionalString(map.get('tag'));
  const attributes = readStringMap(map.get('attributes'));
  const displayOn = readDisplayOn(map.get('displayOn'));
  const bindings = readBindings(map.get('bindings'));
  const eventBindings = readEventBindings(map.get('eventBindings'));
  const style = readStringMap(map.get('style'));
  const shared = {
    id,
    ...(name !== undefined ? { name } : {}),
    ...(styleName !== undefined ? { styleName } : {}),
    ...(classes.length ? { classes } : {}),
    ...(tag !== undefined ? { tag } : {}),
    ...(attributes ? { attributes } : {}),
    ...(displayOn ? { displayOn } : {}),
    ...(layout ? { layout } : {}),
    ...(bindings ? { bindings } : {}),
    ...(eventBindings ? { eventBindings } : {}),
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
  const repeat = readRepeat(map.get('repeat'));
  return makeFlatNode({
    ...shared,
    type: 'frame',
    ...(repeat ? { repeat } : {}),
    children: children instanceof Y.Array ? children.toArray().map(String) : [],
  });
}

export function readFields(list: Y.Array<Y.Map<unknown>>): FieldDefinition[] {
  return list.toArray().map((map) => {
    const options = map.get('options');
    const field: FieldDefinition = {
      name: stringValue(map.get('name')),
      type: map.get('type') as FieldDefinition['type'],
    };
    if (typeof map.get('required') === 'boolean') field.required = map.get('required') as boolean;
    if (map.has('default')) field.default = map.get('default') as FieldValue;
    if (Array.isArray(options)) field.options = options.map(String);
    const itemsValue = map.get('items');
    const items = itemsValue instanceof Y.Map ? readJsonObject(itemsValue) : {};
    if (Object.keys(items).length) field.items = items as unknown as FieldDefinition['items'];
    const schemaValue = map.get('schema');
    const schema = schemaValue instanceof Y.Map ? readJsonObject(schemaValue) : {};
    if (Object.keys(schema).length) field.schema = schema;
    return field;
  });
}

export function readEvents(list: Y.Array<Y.Map<unknown>>): EventDefinition[] {
  return list.toArray().map((map) => {
    const payload = map.get('payload');
    return {
      name: stringValue(map.get('name')),
      ...(payload instanceof Y.Map
        ? { payload: readJsonObject(payload) as EventDefinition['payload'] }
        : {}),
      ...(map.get('data') instanceof Y.Map
        ? {
            data: readJsonObject(
              map.get('data') as Y.Map<unknown>,
            ) as unknown as EventDefinition['data'],
          }
        : {}),
    };
  });
}

function readExposeValue(value: unknown): Expose | undefined {
  if (!(value instanceof Y.Map) || value.size === 0) return undefined;
  return readJsonObject(value) as unknown as Expose;
}

function readDisplayOn(value: unknown): DisplayOn | undefined {
  if (!(value instanceof Y.Map) || value.size === 0) return undefined;
  return readJsonObject(value) as unknown as DisplayOn;
}

function readRepeat(value: unknown): Repeat | undefined {
  const repeat = value instanceof Y.Map ? readJsonObject(value) : {};
  return Object.keys(repeat).length ? (repeat as unknown as Repeat) : undefined;
}

export function readVariants(list: Y.Array<Y.Map<unknown>>): VariantAxis[] {
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

export function readVariantPresets(list: Y.Array<unknown>): { variantPresets?: VariantPreset[] } {
  const presets = readJsonArray(list).filter(isVariantPresetJson) as unknown as VariantPreset[];
  return presets.length ? { variantPresets: presets } : {};
}

export function readSettings(settings: Y.Map<unknown>): DocumentSettings {
  const result: DocumentSettings = {};
  const artboard = settings.get('artboard');
  if (artboard instanceof Y.Map) {
    result.artboard = {
      width: numberValue(artboard.get('width')),
      height: numberValue(artboard.get('height')),
    };
  }
  const breakpoints = settings.get('breakpoints');
  if (breakpoints instanceof Y.Array) {
    const list = breakpoints.toArray().flatMap((item) => {
      if (!(item instanceof Y.Map)) return [];
      const uuid = item.get('uuid');
      const minWidth = item.get('minWidth');
      const label = item.get('label');
      const enabled = item.get('enabled');
      if (typeof uuid !== 'string' || typeof minWidth !== 'number' || typeof label !== 'string') return [];
      return [
        {
          uuid,
          minWidth,
          label,
          ...(enabled === false ? { enabled: false as const } : {}),
        },
      ];
    });
    if (list.length) result.breakpoints = list;
  }
  return result;
}

export function readIcons(list: Y.Array<Y.Map<unknown>>): IconDefinition[] {
  return list.toArray().flatMap((map) => {
    const id = map.get('id');
    const name = map.get('name');
    const src = map.get('src');
    if (typeof id !== 'string' || typeof name !== 'string' || typeof src !== 'string') return [];
    const category = optionalString(map.get('category'));
    return [{ id, name, src, ...(category ? { category } : {}) }];
  });
}

export function readStyleBlock(map: Y.Map<unknown>): { styles?: StyleBlock } {
  const value = readJsonObject(map);
  if (!Object.keys(value).length) return {};
  return { styles: value as unknown as StyleBlock };
}

export function readTokenInterface(map: Y.Map<unknown>): { tokenInterface?: TokenInterface } {
  const value = readJsonObject(map);
  if (!Object.keys(value).length) return {};
  return { tokenInterface: value as unknown as TokenInterface };
}

export function readComponentTokens(map: Y.Map<unknown>): {
  componentTokens?: FlatDocument['componentTokens'];
} {
  const value = readJsonObject(map);
  if (!Object.keys(value).length) return {};
  return { componentTokens: value as unknown as FlatDocument['componentTokens'] };
}

export function readExpose(map: Y.Map<unknown>): { expose?: Expose } {
  const value = readJsonObject(map);
  if (!Object.keys(value).length) return {};
  return { expose: value as unknown as Expose };
}

export function readPreviewData(map: Y.Map<unknown>): { previewData?: PreviewData } {
  const value = readJsonObject(map);
  return Object.keys(value).length ? { previewData: value as PreviewData } : {};
}

function readLayout(value: unknown): Layout | undefined {
  if (!(value instanceof Y.Map) || value.size === 0) return undefined;
  return canonicalizeLayout(readJsonObject(value) as unknown as Layout);
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
  const record = readJsonObject(value) as unknown as Record<string, FieldValue>;
  return Object.keys(record).length ? record : undefined;
}

function readChildFields(value: unknown): Record<string, Record<string, FieldValue>> | undefined {
  if (!(value instanceof Y.Map)) return undefined;
  const result: Record<string, Record<string, FieldValue>> = {};
  for (const [path, fields] of value.entries()) {
    if (!(fields instanceof Y.Map)) continue;
    const record = readJsonObject(fields) as unknown as Record<string, FieldValue>;
    if (Object.keys(record).length) result[path] = record;
  }
  return Object.keys(result).length ? result : undefined;
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

function readEventBindings(value: unknown): EventBinding[] | undefined {
  if (!(value instanceof Y.Array)) return undefined;
  const bindings: EventBinding[] = [];
  for (const item of value.toArray()) {
    if (!(item instanceof Y.Map)) continue;
    const event = item.get('event');
    const name = item.get('name');
    if (typeof event === 'string' && typeof name === 'string') {
      const payload = readStringMap(item.get('payload')) as EventBinding['payload'];
      const dataValue = item.get('data');
      const data =
        dataValue instanceof Y.Array
          ? (readJsonArray(dataValue) as unknown as EventBinding['data'])
          : undefined;
      bindings.push({
        event,
        name,
        ...(payload ? { payload } : {}),
        ...(dataValue instanceof Y.Array ? { data } : {}),
      });
    }
  }
  return bindings.length ? bindings : undefined;
}
