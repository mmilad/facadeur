import { schemaAtPath } from './schema-path.js';
import { DocumentError } from '../../document/errors.js';
import { type FlatDocument } from '../../document/flat.js';
import {
  type Binding,
  type EventBinding,
  type EventDefinition,
  type FieldDefinition,
  type FieldValue,
  type JsonSchema,
  type VariantPreset,
  type SchemaCatalog,
} from '../../schema/document.js';
import {
  assertEventDefinition,
  assertExpose,
  assertFieldDefinition,
  assertValueMatches,
  assertVariantAxis,
  assertVariantPreset,
} from './assertions.js';
import { eventDataMappings, eventDataSchema, localContractFieldsFor } from './schema-use.js';
import { publicFieldsFor } from './catalog-exposed.js';
import { matchesSchemaValue } from './json-schema-value.js';
import type { SchemaResolverContext } from './types.js';

/** Pages do not own component properties; sections may expose data contracts. */
export function assertDefinitionKind(
  doc: FlatDocument,
  fields: ReadonlyMap<string, FieldDefinition> = new Map(
    doc.fields.map((field) => [field.name, field]),
  ),
): void {
  if (doc.kind === 'page') {
    if (fields.size || doc.schemaUse) {
      throw new DocumentError('schema', 'page documents cannot define fields');
    }
    if (doc.variants.length || doc.variantPresets?.length) {
      throw new DocumentError('schema', 'page documents cannot define variants');
    }
    return;
  }
  if (doc.kind === 'section' && doc.variants.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define variants`);
  }
  if (doc.kind === 'section' && doc.variantPresets?.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define variants`);
  }
}

export function validateDefinitions(
  doc: FlatDocument,
  context?: SchemaResolverContext | SchemaCatalog,
): void {
  const schemaCatalog = isResolverContext(context)
    ? context.schemaCatalog
    : (context ?? doc.schemaCatalog);
  const localFields = localContractFieldsFor(doc, schemaCatalog);
  const resolverContext = isResolverContext(context)
    ? context
    : { documents: new Map([[doc.id, doc]]), ...(schemaCatalog ? { schemaCatalog } : {}) };
  const fields = publicFieldsFor(doc, resolverContext);
  assertDefinitionKind(doc, localFields);
  if (!doc.schemaUse) {
    const names = new Set<string>();
    for (const field of doc.fields) {
      assertFieldDefinition(field);
      if (names.has(field.name)) {
        throw new DocumentError('schema', `Duplicate field "${field.name}"`);
      }
      names.add(field.name);
    }
  }
  const events = doc.events ?? [];
  const eventNames = new Set<string>();
  for (const event of events) {
    assertEventDefinition(event);
    if (event.data) {
      const schema = eventDataSchema(event, schemaCatalog);
      if (!schema) {
        throw new DocumentError(
          'unknown-schema',
          `Event "${event.name}" refers to an unknown schema`,
        );
      }
      if (
        event.data.fields &&
        Object.keys(schema.properties ?? {}).length !== event.data.fields.length
      ) {
        throw new DocumentError(
          'unknown-schema',
          `Event "${event.name}" refers to an unknown schema`,
        );
      }
    }
    if (eventNames.has(event.name)) {
      throw new DocumentError('schema', `Duplicate event "${event.name}"`);
    }
    eventNames.add(event.name);
  }
  if (doc.expose) assertExpose(doc.expose);
  const variantNames = new Set<string>();
  for (const axis of doc.variants) {
    assertVariantAxis(axis);
    if (variantNames.has(axis.name)) {
      throw new DocumentError('schema', `Duplicate variant "${axis.name}"`);
    }
    variantNames.add(axis.name);
  }
  for (const variant of doc.variantPresets ?? []) {
    assertVariantPreset(variant);
    assertVariantTargets(doc, variant);
    assertVariantFieldTargets(doc, variant, fields);
    if (variantNames.has(variant.name)) {
      throw new DocumentError('schema', `Duplicate variant "${variant.name}"`);
    }
    variantNames.add(variant.name);
    for (const [name, value] of Object.entries(variant.overrides?.fields ?? {})) {
      const field = fields.get(name);
      if (!field) {
        throw new DocumentError(
          'unknown-field',
          `Variant "${variant.name}" overrides unknown field "${name}"`,
        );
      }
      assertValueMatches(field, value);
    }
  }
  const presetNames = new Set((doc.variantPresets ?? []).map((preset) => preset.name));
  for (const [name, label] of Object.entries(doc.variantLabels ?? {})) {
    if (name !== 'default' && !presetNames.has(name)) {
      throw new DocumentError(
        'unknown-variant',
        `Display name refers to unknown variant "${name}"`,
      );
    }
    if (typeof label !== 'string' || !label.trim()) {
      throw new DocumentError('schema', 'Variant display names cannot be empty');
    }
  }
  const assertPreviewValues = (values: Record<string, FieldValue>) => {
    for (const [name, value] of Object.entries(values)) {
      const field = fields.get(name);
      if (!field && !Object.prototype.hasOwnProperty.call(doc.expose?.fields ?? {}, name))
        throw new DocumentError('unknown-field', `Preview refers to unknown field "${name}"`);
      if (field) assertValueMatches(field, value);
    }
  };
  if (doc.schemaUse?.defaults !== undefined) {
    const defaults = doc.schemaUse.defaults;
    if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
      throw new DocumentError('schema', 'Schema-use defaults must be an object of sample values');
    }
    assertPreviewValues(defaults as Record<string, FieldValue>);
  }
  if (doc.previewData?.fields) assertPreviewValues(doc.previewData.fields);
  for (const [name, values] of Object.entries(doc.previewData?.variants ?? {})) {
    if (!presetNames.has(name)) {
      throw new DocumentError('unknown-variant', `Preview refers to unknown variant "${name}"`);
    }
    assertPreviewValues(values);
  }
  for (const node of Object.values(doc.nodes)) {
    if (node.type === 'instance') continue;
    for (const binding of node.bindings ?? []) {
      if (!fields.has(binding.field)) {
        throw new DocumentError(
          'unknown-field',
          `Node "${node.id}" binds unknown field "${binding.field}"`,
        );
      }
      const field = fields.get(binding.field);
      if (field) assertBindingField(field, binding.target, node.id);
    }
    for (const binding of node.eventBindings ?? []) {
      if (!eventNames.has(binding.event)) {
        throw new DocumentError(
          'unknown-event',
          `Node "${node.id}" binds unknown event "${binding.event}"`,
        );
      }
      if (!binding.name.trim()) {
        throw new DocumentError('schema', `Event binding "${binding.event}" needs a native event`);
      }
      const event = events.find((entry) => entry.name === binding.event);
      if (event && Object.values(event.payload ?? {}).some(isStructuredFieldType)) {
        throw new DocumentError(
          'schema',
          `Event "${binding.event}" uses a structured payload and cannot be bound directly to a native event`,
        );
      }
      if (event) assertEventDataMappingContract(event, binding, schemaCatalog);
    }
  }
}

function isStructuredFieldType(type: FieldDefinition['type']) {
  return type === 'array' || type === 'object';
}

function assertEventDataMappingContract(
  event: EventDefinition,
  binding: EventBinding,
  schemaCatalog?: SchemaCatalog,
) {
  const schema = eventDataSchema(event, schemaCatalog);
  if (!schema) {
    if (binding.data?.length || Object.keys(binding.payload ?? {}).length) {
      throw new DocumentError('schema', `Event "${event.name}" has no data to map`);
    }
    return;
  }
  const mappings = eventDataMappings(event, binding) ?? [];
  if (event.data && !binding.data) {
    throw new DocumentError('schema', `Event "${event.name}" requires explicit data mappings`);
  }
  const seen = new Set<string>();
  for (const mapping of mappings) {
    if (seen.has(mapping.path)) {
      throw new DocumentError(
        'schema',
        `Event "${event.name}" maps "${mapping.path}" more than once`,
      );
    }
    if (
      [...seen].some(
        (path) =>
          !path ||
          !mapping.path ||
          path.startsWith(`${mapping.path}.`) ||
          mapping.path.startsWith(`${path}.`),
      )
    ) {
      throw new DocumentError('schema', `Event "${event.name}" has overlapping data mappings`);
    }
    seen.add(mapping.path);
    const destination = schemaAtPath(schema, mapping.path);
    if (!destination) {
      throw new DocumentError('schema', `Event data path "${mapping.path}" is not defined`);
    }
    if (mapping.source.kind === 'native') {
      const expected = nativeValueType(mapping.source.path);
      if (destination.enum?.length || !schemaAcceptsType(destination, expected)) {
        throw new DocumentError(
          'schema',
          `Native source "${mapping.source.path}" is incompatible with "${mapping.path}"`,
        );
      }
    } else if (
      mapping.source.kind === 'literal' &&
      !matchesSchemaValue(mapping.source.value, destination)
    ) {
      throw new DocumentError(
        'schema',
        `Literal event data is incompatible with "${mapping.path}"`,
      );
    }
  }
  const schemaType = basicJsonType(schema);
  if (schemaType !== 'object' && schemaType !== 'array' && !seen.has('')) {
    throw new DocumentError('schema', `Scalar event "${event.name}" must map its whole data value`);
  }
  if (!hasRequiredMappings(schema, seen)) {
    const missing = firstMissingRequiredPath(schema, seen);
    throw new DocumentError(
      'schema',
      `Event "${event.name}" is missing required data mapping${missing ? ` "${missing}"` : ''}`,
    );
  }
}

function hasRequiredMappings(
  schema: JsonSchema,
  mapped: ReadonlySet<string>,
  prefix = '',
): boolean {
  if (mapped.has('') || mapped.has(prefix)) return true;
  for (const branch of schema.allOf ?? []) {
    if (!hasRequiredMappings(branch, mapped, prefix)) return false;
  }
  const unions = [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])];
  if (unions.length && !unions.some((branch) => hasRequiredMappings(branch, mapped, prefix)))
    return false;
  for (const name of schema.required ?? []) {
    const path = prefix ? `${prefix}.${name}` : name;
    const child = schema.properties?.[name];
    const directlyMapped = [...mapped].some(
      (entry) => entry === path || entry.startsWith(`${path}.`),
    );
    if (!directlyMapped) return false;
    if (child && !hasRequiredMappings(child, mapped, path)) return false;
  }
  return true;
}

function firstMissingRequiredPath(
  schema: JsonSchema,
  mapped: ReadonlySet<string>,
  prefix = '',
): string | undefined {
  for (const branch of schema.allOf ?? []) {
    const missing = firstMissingRequiredPath(branch, mapped, prefix);
    if (missing) return missing;
  }
  for (const name of schema.required ?? []) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (![...mapped].some((entry) => entry === path || entry.startsWith(`${path}.`))) return path;
    const child = schema.properties?.[name];
    if (child) {
      const missing = firstMissingRequiredPath(child, mapped, path);
      if (missing) return missing;
    }
  }
  for (const branch of [...(schema.oneOf ?? []), ...(schema.anyOf ?? [])]) {
    const missing = firstMissingRequiredPath(branch, mapped, prefix);
    if (missing) return missing;
  }
  return undefined;
}

function nativeValueType(path: string) {
  return path === 'currentTarget.checked'
    ? 'boolean'
    : path === 'currentTarget.valueAsNumber'
      ? 'number'
      : 'string';
}

function basicJsonType(schema: JsonSchema): string | undefined {
  if (Array.isArray(schema.type)) return schema.type.find((type) => type !== 'null');
  if (schema.type) return schema.type;
  if (schema.properties) return 'object';
  return undefined;
}

function schemaAcceptsType(schema: JsonSchema, sourceType: string): boolean {
  const type = basicJsonType(schema);
  if (type === sourceType || (sourceType === 'number' && type === 'integer')) return true;
  return (schema.oneOf ?? schema.anyOf ?? []).some((branch) =>
    schemaAcceptsType(branch, sourceType),
  );
}

function assertBindingField(field: FieldDefinition, target: Binding['target'], nodeId: string) {
  if (isStructuredFieldType(field.type)) {
    throw new DocumentError(
      'schema',
      `Binding "${field.name}" on node "${nodeId}" cannot use structured field type "${field.type}" for ${target}`,
    );
  }
  if (target === 'visible' && field.type !== 'boolean') {
    throw new DocumentError(
      'schema',
      `Binding "${field.name}" on node "${nodeId}" targeting visible needs a boolean field`,
    );
  }
}

function assertVariantFieldTargets(
  doc: FlatDocument,
  variant: VariantPreset,
  fields: ReadonlyMap<string, FieldDefinition> = new Map(
    doc.fields.map((field) => [field.name, field]),
  ),
) {
  const overrides = variant.overrides;
  if (!overrides) return;
  const fieldNames = new Set(fields.keys());
  for (const fieldName of overrides.unsetFields ?? []) {
    if (!fieldNames.has(fieldName)) {
      throw new DocumentError(
        'unknown-field',
        `Variant "${variant.name}" unsets unknown field "${fieldName}" on "${doc.id}"`,
      );
    }
    if (overrides.fields && Object.prototype.hasOwnProperty.call(overrides.fields, fieldName)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" cannot set and unset field "${fieldName}" together`,
      );
    }
  }
}

function isResolverContext(
  context: SchemaResolverContext | SchemaCatalog | undefined,
): context is SchemaResolverContext {
  return Boolean(context && 'documents' in context);
}

export function assertVariantTargets(doc: FlatDocument, variant: VariantPreset) {
  const overrides = variant.overrides;
  if (!overrides) return;
  for (const target of Object.keys(overrides.nodes ?? {})) {
    if (!hasNodeTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" targets unknown node "${target}" on "${doc.id}"`,
      );
    }
  }
  for (const target of overrides.removed ?? []) {
    if (!hasNodeTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" removes unknown node "${target}" on "${doc.id}"`,
      );
    }
    if (isRootTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" cannot remove the root node "${doc.rootId}"`,
      );
    }
  }
  const removed = overrides.removed ?? [];
  for (const insertion of overrides.insertions ?? []) {
    if (!hasNodeTarget(doc, insertion.parent)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" inserts under unknown node "${insertion.parent}" on "${doc.id}"`,
      );
    }
    if (
      removed.some(
        (target) => insertion.parent === target || insertion.parent.startsWith(`${target}.`),
      )
    ) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" cannot insert under removed node "${insertion.parent}"`,
      );
    }
    const parent = nodeForTarget(doc, insertion.parent);
    if (parent?.type !== 'frame') {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" can only insert under a frame ("${insertion.parent}")`,
      );
    }
  }
}

function hasNodeTarget(doc: FlatDocument, target: string) {
  return Boolean(nodeForTarget(doc, target));
}

function isRootTarget(doc: FlatDocument, target: string) {
  return target === doc.rootId || target === `${doc.rootId}`;
}

function nodeForTarget(doc: FlatDocument, target: string) {
  const direct = doc.nodes[target];
  if (direct) return direct;
  const parts = target.split('.');
  if (parts[0] !== doc.rootId) return undefined;
  let current = doc.nodes[doc.rootId];
  for (const id of parts.slice(1)) {
    if (!current || current.type !== 'frame' || !current.children.includes(id)) return undefined;
    current = doc.nodes[id];
  }
  return current;
}
