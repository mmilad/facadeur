import {
  eventDataMappings,
  eventDataSchema,
  matchesSchemaValue,
  type EventBinding,
  type EventDataMapping,
  type EventDataSource,
  type FieldDefinition,
  type JsonSchema,
} from '@facadeur/core';
import { CodegenError, quote } from '../../names';
import { jsLiteral } from '../catalog';
import type { Attr, CatalogEntry } from '../types';
import { dataExpression } from './data-expressions';

const REACT_EVENT_PROPS: Readonly<Record<string, string>> = {
  blur: 'onBlur',
  change: 'onChange',
  click: 'onClick',
  focus: 'onFocus',
  input: 'onInput',
  keydown: 'onKeyDown',
  keyup: 'onKeyUp',
  pointerdown: 'onPointerDown',
  pointerup: 'onPointerUp',
  submit: 'onSubmit',
};

interface MappingBranch {
  expression?: string;
  children: Map<string, MappingBranch>;
}

export function eventAttributes(
  bindings: EventBinding[] | undefined,
  owner: CatalogEntry,
  usedProps: Set<string>,
  dataScope: ReadonlyMap<string, string>,
  tag: string,
): Attr[] {
  const handlers = new Map<string, string[]>();
  for (const binding of bindings ?? []) {
    const event = owner.events.get(binding.event);
    const definition = owner.document.events?.find((candidate) => candidate.name === binding.event);
    if (!event || !definition) {
      throw new CodegenError(`Unknown event "${binding.event}" on "${owner.document.id}"`);
    }
    if (
      !definition.data &&
      Object.values(definition.payload ?? {}).some((type) => type === 'array' || type === 'object')
    ) {
      throw new CodegenError(
        `Legacy event "${binding.event}" has a structured payload and cannot be bound to a native event`,
      );
    }
    usedProps.add(event.name);
    const nativeName = reactEventProp(binding.name);
    const schema = eventDataSchema(definition, owner.schemaCatalog);
    const mappings = eventDataMappings(definition, binding) ?? [];
    assertMappingContract(definition.name, schema, mappings, owner);
    assertNativeSchemaType(schema, mappings, binding.event);
    for (const mapping of mappings) {
      if (mapping.source.kind === 'native') {
        assertNativeSourceTarget(mapping.source.path, tag, binding.event);
      }
    }
    const data = schema ? mappedDataExpression(mappings, owner, dataScope, usedProps) : 'undefined';
    const callbacks = handlers.get(nativeName) ?? [];
    callbacks.push(
      `${event.name}?.({ eventName: ${quote(event.eventName ?? binding.event)}, event: reactEvent.nativeEvent, native: reactEvent.nativeEvent.type, data: ${data} })`,
    );
    handlers.set(nativeName, callbacks);
  }
  return [...handlers].map(([name, callbacks]) => ({
    name,
    value: {
      kind: 'expr' as const,
      code: `(reactEvent) => ${callbacks.length === 1 ? callbacks[0] : `{ ${callbacks.join('; ')}; }`}`,
    },
  }));
}

function assertMappingContract(
  eventName: string,
  schema: JsonSchema | undefined,
  mappings: EventDataMapping[],
  owner: CatalogEntry,
): void {
  if (!schema) {
    if (mappings.length) throw new CodegenError(`Event "${eventName}" has no data to map`);
    return;
  }
  const seen = new Set<string>();
  for (const mapping of mappings) {
    if (seen.has(mapping.path)) {
      throw new CodegenError(`Event "${eventName}" maps "${mapping.path}" more than once`);
    }
    seen.add(mapping.path);
    const destination = schemaAtPath(schema, mapping.path);
    if (!destination) {
      throw new CodegenError(`Event data path "${mapping.path}" is not defined`);
    }
    if (mapping.source.kind === 'native') {
      const sourceType = nativeSourceType(mapping.source.path);
      if (!schemaAcceptsType(destination, sourceType)) {
        throw new CodegenError(
          `Native source "${mapping.source.path}" is incompatible with event data "${mapping.path}"`,
        );
      }
    } else if (
      mapping.source.kind === 'literal' &&
      !matchesSchemaValue(mapping.source.value, destination)
    ) {
      throw new CodegenError(`Literal event data is incompatible with "${mapping.path}"`);
    } else if (mapping.source.kind === 'context') {
      const source = contextField(mapping.source.path, owner);
      if (source && !schemaAcceptsField(destination, source)) {
        throw new CodegenError(
          `Context source "${mapping.source.path}" is incompatible with event data "${mapping.path}"`,
        );
      }
      if (
        source?.required === false &&
        source.default === undefined &&
        isRequiredSchemaPath(schema, mapping.path)
      ) {
        throw new CodegenError(
          `Optional context source "${mapping.source.path}" cannot satisfy required event data "${mapping.path}"`,
        );
      }
    }
  }
  for (const path of requiredPaths(schema)) {
    const target = schemaAtPath(schema, path);
    const covered = [...seen].some(
      (mapped) =>
        mapped === '' ||
        path === mapped ||
        path.startsWith(`${mapped}.`) ||
        (schemaType(target ?? {}) === 'object' && mapped.startsWith(`${path}.`)),
    );
    if (!covered) {
      throw new CodegenError(`Event "${eventName}" is missing required data mapping "${path}"`);
    }
  }
  const type = schemaType(schema);
  if (type !== 'object' && type !== 'array' && !seen.has('')) {
    throw new CodegenError(`Scalar event "${eventName}" must map its whole data value`);
  }
}

function contextField(path: string, owner: CatalogEntry): FieldDefinition | undefined {
  const [head, ...tail] = path.split('.');
  const name = head === 'props' ? tail.shift() : head;
  if (!name || ['item', 'index', 'parent'].includes(name)) return undefined;
  const field = owner.contractFields.get(name);
  if (!field || !tail.length) return field;
  let schema = field.schema;
  for (const segment of tail) schema = schema?.properties?.[segment];
  if (!schema) return undefined;
  return {
    name: tail.at(-1) ?? field.name,
    type: schemaFieldType(schema),
    ...(schema.required ? { required: true } : {}),
    schema,
  };
}

function schemaFieldType(schema: JsonSchema): FieldDefinition['type'] {
  if (schema.enum || schema.const !== undefined) return 'enum';
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'array';
  if (type === 'object' || schema.properties) return 'object';
  return 'text';
}

function schemaAcceptsField(schema: JsonSchema, field: FieldDefinition): boolean {
  if (field.schema) return schemaAcceptsSchema(schema, field.schema);
  const type =
    field.type === 'boolean'
      ? 'boolean'
      : field.type === 'number'
        ? 'number'
        : field.type === 'array'
          ? 'array'
          : field.type === 'object'
            ? 'object'
            : 'string';
  return schemaAcceptsType(schema, type);
}

function schemaAcceptsSchema(target: JsonSchema, source: JsonSchema): boolean {
  const sourceType = schemaType(source);
  if (sourceType) return schemaAcceptsType(target, sourceType);
  if (source.allOf) return source.allOf.every((branch) => schemaAcceptsSchema(target, branch));
  const alternatives = source.anyOf ?? source.oneOf;
  return alternatives?.every((branch) => schemaAcceptsSchema(target, branch)) ?? false;
}

function schemaAcceptsType(schema: JsonSchema, sourceType: string): boolean {
  if (schema.allOf?.length) {
    return schema.allOf.every((branch) => schemaAcceptsType(branch, sourceType));
  }
  const alternatives = schema.anyOf ?? schema.oneOf;
  if (alternatives?.length) {
    return alternatives.some((branch) => schemaAcceptsType(branch, sourceType));
  }
  const type = schemaType(schema);
  return type === sourceType || (sourceType === 'number' && type === 'integer');
}

function schemaType(schema: JsonSchema): string | undefined {
  if (Array.isArray(schema.type)) return schema.type.find((type) => type !== 'null');
  return schema.type ?? (schema.properties ? 'object' : undefined);
}

function nativeSourceType(path: string): string {
  return path === 'currentTarget.checked'
    ? 'boolean'
    : path === 'currentTarget.valueAsNumber'
      ? 'number'
      : 'string';
}

function schemaAtPath(schema: JsonSchema, path: string): JsonSchema | undefined {
  if (!path) return schema;
  const [head, ...tail] = path.split('.');
  if (!head) return undefined;
  const branches = schema.anyOf ?? schema.oneOf ?? schema.allOf ?? [schema];
  for (const branch of branches) {
    const child = /^\d+$/.test(head) ? branch.items : branch.properties?.[head];
    if (child) return schemaAtPath(child, tail.join('.'));
  }
  return undefined;
}

function requiredPaths(schema: JsonSchema, prefix = ''): string[] {
  const paths = (schema.required ?? []).map((name) => (prefix ? `${prefix}.${name}` : name));
  for (const name of schema.required ?? []) {
    const child = schema.properties?.[name];
    if (child) paths.push(...requiredPaths(child, prefix ? `${prefix}.${name}` : name));
  }
  return paths;
}

function isRequiredSchemaPath(schema: JsonSchema, path: string): boolean {
  return requiredPaths(schema).includes(path);
}

function reactEventProp(name: string): string {
  const nativeName = name.startsWith('on') ? name.slice(2) : name;
  const prop = REACT_EVENT_PROPS[nativeName.toLowerCase()];
  if (!prop) throw new CodegenError(`Native event "${name}" has no supported React event prop`);
  return prop;
}

function assertNativeSourceTarget(
  source: Extract<EventDataSource, { kind: 'native' }>['path'],
  tag: string,
  eventName: string,
): void {
  const target = tag.toLowerCase();
  if (source === 'currentTarget.checked' && target !== 'input') {
    throw new CodegenError(
      `Event "${eventName}" reads currentTarget.checked from <${tag}>; use an input element`,
    );
  }
  if (source === 'currentTarget.valueAsNumber' && target !== 'input') {
    throw new CodegenError(
      `Event "${eventName}" reads currentTarget.valueAsNumber from <${tag}>; use an input element`,
    );
  }
  if (
    source === 'currentTarget.value' &&
    target !== 'input' &&
    target !== 'textarea' &&
    target !== 'select' &&
    target !== 'button' &&
    target !== 'option'
  ) {
    throw new CodegenError(
      `Event "${eventName}" reads currentTarget.value from unsupported <${tag}> element`,
    );
  }
}

function mappedDataExpression(
  mappings: EventDataMapping[],
  owner: CatalogEntry,
  dataScope: ReadonlyMap<string, string>,
  usedProps: Set<string>,
): string {
  const root: MappingBranch = { children: new Map() };
  for (const mapping of mappings) {
    const expression = sourceExpression(mapping.source, owner, dataScope, usedProps);
    if (!mapping.path) {
      root.expression = expression;
      continue;
    }
    let branch = root;
    for (const segment of mapping.path.split('.')) {
      let child = branch.children.get(segment);
      if (!child) {
        child = { children: new Map() };
        branch.children.set(segment, child);
      }
      branch = child;
    }
    branch.expression = expression;
  }
  return renderMappingBranch(root);
}

function sourceExpression(
  source: EventDataSource,
  owner: CatalogEntry,
  dataScope: ReadonlyMap<string, string>,
  usedProps: Set<string>,
): string {
  switch (source.kind) {
    case 'native':
      return `reactEvent.${source.path}`;
    case 'context':
      return dataExpression(source.path, owner, dataScope, usedProps);
    case 'literal':
      return jsLiteral(source.value);
  }
}

function renderMappingBranch(branch: MappingBranch): string {
  if (branch.expression !== undefined) return branch.expression;
  const children = [...branch.children];
  if (children.length > 0 && children.every(([key]) => /^\d+$/.test(key))) {
    const highest = Math.max(-1, ...children.map(([key]) => Number(key)));
    const values = Array.from({ length: highest + 1 }, (_, index) => {
      const child = branch.children.get(String(index));
      return child ? renderMappingBranch(child) : 'undefined';
    });
    return `[${values.join(', ')}]`;
  }
  return `{ ${children.map(([key, child]) => `${quote(key)}: ${renderMappingBranch(child)}`).join(', ')} }`;
}

/** Reject native DOM values that TypeScript cannot narrow to schema literals. */
export function assertNativeSchemaType(
  schema: JsonSchema | undefined,
  mappings: EventDataMapping[],
  eventName: string,
): void {
  if (!schema) return;
  for (const mapping of mappings) {
    if (mapping.source.kind !== 'native') continue;
    const destinations = schemasAtPath(schema, mapping.path);
    if (destinations.some(isNarrowSchema)) {
      throw new CodegenError(
        `Event "${eventName}" maps a native value to constrained data "${mapping.path || '(whole value)'}"; use a typed context or literal source`,
      );
    }
  }
}

function schemasAtPath(schema: JsonSchema, path: string): JsonSchema[] {
  if (!path) return [schema];
  const [segment, ...tail] = path.split('.');
  if (!segment) return [];
  const alternatives = schema.anyOf ?? schema.oneOf;
  if (alternatives) {
    return alternatives.flatMap((branch) => schemasAtPath(branch, path));
  }
  const intersections = schema.allOf;
  if (intersections) {
    return intersections.flatMap((branch) => schemasAtPath(branch, path));
  }
  const property = /^\d+$/.test(segment) ? schema.items : schema.properties?.[segment];
  return property ? schemasAtPath(property, tail.join('.')) : [];
}

function isNarrowSchema(schema: JsonSchema): boolean {
  if (schema.const !== undefined || schema.enum?.length) return true;
  if (schema.allOf?.some(isNarrowSchema)) return true;
  const alternatives = schema.anyOf ?? schema.oneOf;
  return Boolean(alternatives?.length && alternatives.every(isNarrowSchema));
}
