import { schemaAtPath } from './schema-path.js';
import { DocumentError } from '../../document/errors.js';
import { type FlatDocument, toNested, type FlatNode } from '../../document/flat.js';
import {
  type FieldDefinition,
  type JsonSchema,
  type SchemaCatalog,
} from '../../schema/document.js';
import { variantPresets } from '../variants/resolve.js';
import { assertValueMatches } from './assertions.js';
import {
  componentDataSchema,
  publicFieldsFor,
  structuralChildSchemas,
  structuralScopeFields,
} from './catalog-exposed.js';
import type { SchemaResolverContext } from './types.js';
import { eventDataMappings, eventDataSchema, localContractFieldsFor } from './schema-use.js';
import { resolveJsonSchema } from './json-schema-value.js';

interface DataScope {
  fields: ReadonlyMap<string, FieldDefinition>;
  aliases: ReadonlyMap<string, FieldDefinition>;
  ambientAliases: ReadonlyMap<string, FieldDefinition>;
  schemaCatalog?: SchemaCatalog;
}

export function validateDataContracts(doc: FlatDocument, context: SchemaResolverContext) {
  const fields = localContractFieldsFor(doc, context.schemaCatalog);
  for (const [name, definition] of publicFieldsFor(doc, context)) {
    if (!fields.has(name)) fields.set(name, definition);
  }
  const ambientAliases = ambientStructuralAliases(doc, context);
  const visit = (id: string, scope: DataScope) => {
    const node = doc.nodes[id];
    if (!node) return;

    for (const binding of ('eventBindings' in node ? node.eventBindings : undefined) ?? []) {
      const event = doc.events?.find((entry) => entry.name === binding.event);
      if (!event) continue;
      const schema = eventDataSchema(event, context.schemaCatalog);
      if (!schema) continue;
      for (const mapping of eventDataMappings(event, binding) ?? []) {
        if (mapping.source.kind !== 'context') continue;
        const source = assertDataPath(
          mapping.source.path,
          scope,
          `event data mapping "${mapping.path}" on node "${node.id}"`,
        );
        const destination = schemaAtPath(schema, mapping.path);
        if (
          destination &&
          (!schemaAcceptsField(destination, source, scope.schemaCatalog) ||
            (isRequiredEventDataPath(schema, mapping.path) &&
              source.required !== true &&
              source.default === undefined))
        ) {
          throw new DocumentError(
            'schema',
            `Context path "${mapping.source.path}" is incompatible with event data "${mapping.path}" on node "${node.id}"`,
          );
        }
      }
    }

    if (node.displayOn) {
      const conditionField = assertDataPath(
        node.displayOn.path,
        scope,
        `displayOn on node "${node.id}"`,
      );
      assertDisplayCondition(node.displayOn, conditionField, `node "${node.id}"`);
    }

    if (node.type === 'instance') {
      const target = context.documents.get(node.component);
      for (const rule of node.variantRules ?? []) {
        const source = assertDataPath(rule.when.path, scope, `variant rule on node "${node.id}"`);
        assertDisplayCondition(rule.when, source, `variant rule on node "${node.id}"`);
        if (
          rule.variant !== 'default' &&
          target &&
          !variantPresets('root' in target ? target : toNested(target)).some(
            (preset) => preset.name === rule.variant,
          )
        ) {
          throw new DocumentError(
            'unknown-variant',
            `Rule on "${node.id}" refers to unknown variant "${rule.variant}"`,
          );
        }
      }
      const targetFields = target ? publicFieldsFor(target, context) : undefined;
      for (const [field, path] of Object.entries(node.fieldBindings ?? {})) {
        const source = assertDataPath(path, scope, `field binding "${field}" on node "${node.id}"`);
        const destination = targetFields?.get(field);
        if (destination && source.schema?.['x-facadeur-ambient-parent'] !== true) {
          assertFieldBinding(source, destination, node, field, path);
        }
      }
      return;
    }

    if (node.type === 'repeater') {
      const source = assertDataPath('items', scope, `repeater on node "${node.id}"`);
      if (source.type !== 'array') {
        throw new DocumentError('schema', `Repeater on node "${node.id}" needs array items`);
      }
      const inherited = [...scope.aliases.values()];
      for (const candidate of structuralChildSchemas(doc, node.id, context)) {
        visit(
          candidate.node.id,
          scopeForFields(
            structuralScopeFields(doc, candidate.node.id, context, inherited),
            scope.ambientAliases,
            scope.schemaCatalog,
          ),
        );
      }
      return;
    }

    if (node.type === 'switch') {
      const inherited = [...scope.aliases.values()];
      for (const candidate of structuralChildSchemas(doc, node.id, context)) {
        visit(
          candidate.node.id,
          scopeForFields(
            structuralScopeFields(doc, candidate.node.id, context, inherited),
            scope.ambientAliases,
            scope.schemaCatalog,
          ),
        );
      }
      return;
    }

    if (node.type !== 'frame') return;
    let childScope = scope;
    if (node.repeat) {
      const source = assertDataPath(node.repeat.path, scope, `repeat on node "${node.id}"`);
      if (source.type !== 'array') {
        throw new DocumentError(
          'schema',
          `Repeat path "${node.repeat.path}" on node "${node.id}" must resolve to an array`,
        );
      }
      const repeatAlias = node.repeat.as ?? 'item';
      if (scope.fields.has(repeatAlias) || scope.aliases.has(repeatAlias)) {
        throw new DocumentError(
          'schema',
          `Repeat alias "${repeatAlias}" on node "${node.id}" shadows an existing data path`,
        );
      }
      const item = itemField(source, repeatAlias);
      if (node.repeat.key) {
        if (!item) {
          throw new DocumentError(
            'schema',
            `Repeat key "${node.repeat.key}" on node "${node.id}" needs object items`,
          );
        }
        const keyField = assertDataPath(
          node.repeat.key,
          scopeForObject(item, scope.schemaCatalog),
          `repeat key on node "${node.id}"`,
        );
        if (!isScalarField(keyField)) {
          throw new DocumentError(
            'schema',
            `Repeat key "${node.repeat.key}" on node "${node.id}" must resolve to a scalar field`,
          );
        }
      }
      childScope = {
        fields: scope.fields,
        aliases: new Map(scope.aliases).set(repeatAlias, item ?? scalarItemField(repeatAlias)),
        ambientAliases: scope.ambientAliases,
      };
    }
    for (const childId of node.children) visit(childId, childScope);
  };

  visit(doc.rootId, {
    fields,
    aliases: new Map(),
    ambientAliases,
    ...(context.schemaCatalog ? { schemaCatalog: context.schemaCatalog } : {}),
  });
}

function schemaAcceptsField(
  schema: JsonSchema,
  source: FieldDefinition,
  schemaCatalog?: SchemaCatalog,
): boolean {
  return schemasCompatible(fieldSchema(source, schemaCatalog), schema);
}

function fieldSchema(field: FieldDefinition, schemaCatalog?: SchemaCatalog): JsonSchema {
  if (field.schema) return resolveJsonSchema(field.schema, schemaCatalog);
  const type = schemaTypeForField(field.type);
  if (field.type === 'array') {
    const items = field.items;
    const itemSchema = items?.schema
      ? resolveJsonSchema(items.schema, schemaCatalog)
      : items
        ? fieldSchema(
            {
              name: `${field.name}[]`,
              type: items.type,
              ...(items.options ? { options: items.options } : {}),
              ...(items.fields ? { items: { type: items.type, fields: items.fields } } : {}),
            },
            schemaCatalog,
          )
        : undefined;
    return { type, ...(itemSchema ? { items: itemSchema } : {}) };
  }
  if (field.type === 'object') {
    const fields = field.items?.fields ?? [];
    return {
      type,
      properties: Object.fromEntries(
        fields.map((child) => [child.name, fieldSchema(child, schemaCatalog)]),
      ),
      ...(fields.some((child) => child.required === true || child.default !== undefined)
        ? {
            required: fields
              .filter((child) => child.required === true || child.default !== undefined)
              .map((child) => child.name),
          }
        : {}),
      additionalProperties: false,
    };
  }
  return {
    type,
    ...(field.type === 'enum' && field.options?.length ? { enum: field.options } : {}),
  };
}

function schemaTypeForField(type: FieldDefinition['type']) {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'array';
  if (type === 'object') return 'object';
  return 'string';
}

function schemasCompatible(source: JsonSchema, destination: JsonSchema): boolean {
  const sourceType = basicSchemaType(source);
  const destinationType = basicSchemaType(destination);
  if (
    sourceType &&
    destinationType &&
    sourceType !== destinationType &&
    !(sourceType === 'number' && destinationType === 'integer')
  ) {
    return false;
  }
  if (
    destination.enum?.length &&
    (!source.enum?.length || source.enum.some((value) => !destination.enum?.includes(value)))
  ) {
    return false;
  }
  if ((destination.allOf ?? []).some((branch) => !schemasCompatible(source, branch))) {
    return false;
  }
  for (const alternatives of [destination.oneOf, destination.anyOf]) {
    if (alternatives?.length && !alternatives.some((branch) => schemasCompatible(source, branch))) {
      return false;
    }
  }
  if (destinationType === 'object') {
    for (const name of destination.required ?? []) {
      const sourceProperty = source.properties?.[name];
      const destinationProperty = destination.properties?.[name];
      if (!sourceProperty || !destinationProperty || !source.required?.includes(name)) return false;
      if (!schemasCompatible(sourceProperty, destinationProperty)) return false;
    }
    if (destination.additionalProperties === false) {
      if (source.additionalProperties !== false) return false;
      for (const [name, sourceProperty] of Object.entries(source.properties ?? {})) {
        const destinationProperty = destination.properties?.[name];
        if (!destinationProperty || !schemasCompatible(sourceProperty, destinationProperty)) {
          return false;
        }
      }
    }
  }
  if (destinationType === 'array' && destination.items) {
    if (!source.items || !schemasCompatible(source.items, destination.items)) return false;
  }
  return true;
}

function isRequiredEventDataPath(schema: JsonSchema, path: string): boolean {
  if (!path) return true;
  const [name, ...parts] = path.split('.');
  if (!name) return false;
  const required = [schema, ...(schema.allOf ?? [])].some((parent) =>
    parent.required?.includes(name),
  );
  if (!required) return false;
  const child = [schema, ...(schema.allOf ?? [])]
    .map((parent) => parent.properties?.[name])
    .find(Boolean);
  return parts.length && child ? isRequiredEventDataPath(child, parts.join('.')) : true;
}

function basicSchemaType(schema: JsonSchema) {
  return Array.isArray(schema.type)
    ? schema.type.find((type) => type !== 'null')
    : (schema.type ?? (schema.properties ? 'object' : undefined));
}

function ambientStructuralAliases(doc: FlatDocument, context: SchemaResolverContext) {
  const payload = componentDataSchema(doc.id, context) ?? { type: 'object' as const };
  const item: FieldDefinition = {
    name: 'item',
    type: 'object',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        props: payload,
      },
      required: ['type', 'props'],
      additionalProperties: false,
    },
  };
  const props: FieldDefinition = { name: 'props', type: 'object', schema: payload };
  const index: FieldDefinition = { name: 'index', type: 'number', schema: { type: 'integer' } };
  return new Map([
    ['item', item],
    ['props', props],
    ['index', index],
  ]);
}

function assertFieldBinding(
  source: FieldDefinition,
  destination: FieldDefinition,
  node: Extract<FlatNode, { type: 'instance' }>,
  field: string,
  path: string,
) {
  const destinationRequired = destination.required === true && destination.default === undefined;
  const sourceOptional = source.required !== true && source.default === undefined;
  if (destinationRequired && sourceOptional) {
    throw new DocumentError(
      'schema',
      `Field binding "${field}" on node "${node.id}" may be undefined at "${path}" but "${field}" on "${node.component}" is required`,
    );
  }
  if (!compatibleFieldType(source, destination)) {
    throw new DocumentError(
      'schema',
      `Field binding "${field}" on node "${node.id}" maps ${source.type} to incompatible ${destination.type} field on "${node.component}"`,
    );
  }
}

function compatibleFieldType(source: FieldDefinition, destination: FieldDefinition): boolean {
  const sourceKind = fieldValueKind(source.type);
  const destinationKind = fieldValueKind(destination.type);
  if (sourceKind !== destinationKind) return false;
  if (destination.type === 'enum') {
    if (source.type !== 'enum') return false;
    return (source.options ?? []).every((option) => destination.options?.includes(option));
  }
  if (destination.type === 'array') {
    if (source.type !== 'array') return false;
    return compatibleItemTypes(source.items, destination.items);
  }
  if (destination.type === 'object') {
    if (source.type !== 'object') return false;
    return compatibleObjectFields(source.items?.fields, destination.items?.fields);
  }
  return true;
}

function compatibleItemTypes(
  sourceItems: FieldDefinition['items'],
  destinationItems: FieldDefinition['items'],
): boolean {
  if (!destinationItems) return true;
  if (!sourceItems) return false;
  return compatibleFieldType(
    fieldFromItems(sourceItems, 'source[]'),
    fieldFromItems(destinationItems, 'destination[]'),
  );
}

function compatibleObjectFields(
  sourceFields: readonly FieldDefinition[] | undefined,
  destinationFields: readonly FieldDefinition[] | undefined,
) {
  if (!destinationFields?.length) return true;
  const sourceByName = new Map((sourceFields ?? []).map((field) => [field.name, field]));
  for (const destination of destinationFields) {
    const source = sourceByName.get(destination.name);
    if (!source) {
      if (isRequiredField(destination)) return false;
      continue;
    }
    if (isRequiredField(destination) && !isRequiredField(source)) return false;
    if (!compatibleFieldType(source, destination)) return false;
  }
  return true;
}

function fieldFromItems(
  items: NonNullable<FieldDefinition['items']>,
  name: string,
): FieldDefinition {
  return {
    name,
    type: items.type,
    ...(items.schema ? { schema: items.schema } : {}),
    ...(items.options ? { options: items.options } : {}),
    ...(items.fields ? { items: { type: items.type, fields: items.fields } } : {}),
  };
}

function isRequiredField(field: FieldDefinition) {
  return field.required === true && field.default === undefined;
}

function assertDisplayCondition(
  condition: NonNullable<FlatNode['displayOn']>,
  field: FieldDefinition,
  context: string,
) {
  const hasEquals = 'equals' in condition;
  const hasTruthy = 'truthy' in condition;
  if (hasEquals === hasTruthy) {
    throw new DocumentError(
      'schema',
      `Display condition on ${context} needs exactly one of "equals" or "truthy"`,
    );
  }
  if (!hasEquals || !('equals' in condition)) return;
  if (!isScalarField(field)) {
    throw new DocumentError(
      'schema',
      `Display condition on ${context} can only compare scalar fields, not ${field.type}`,
    );
  }
  try {
    assertValueMatches(field, condition.equals);
  } catch (error) {
    const message = error instanceof DocumentError ? error.message : 'has an invalid value';
    throw new DocumentError('schema', `Display condition on ${context} ${message}`);
  }
}

function isScalarField(field: FieldDefinition) {
  return fieldValueKind(field.type) !== 'array' && fieldValueKind(field.type) !== 'object';
}

function fieldValueKind(type: FieldDefinition['type']) {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'array';
  if (type === 'object') return 'object';
  return 'string';
}

function assertDataPath(path: string, scope: DataScope, context: string) {
  const field = resolveDataPath(path, scope);
  if (!field) {
    if (
      /^parent(?:\.parent)*\.[A-Za-z_$][A-Za-z0-9_$-]*(?:\.[A-Za-z_$][A-Za-z0-9_$-]*)*$/.test(path)
    ) {
      return {
        name: path.split('.').at(-1)!,
        type: 'text',
        schema: { 'x-facadeur-ambient-parent': true },
      } satisfies FieldDefinition;
    }
    throw new DocumentError('unknown-field', `Data path "${path}" in ${context} is not defined`);
  }
  return field;
}

function scopeForFields(
  fields: readonly FieldDefinition[],
  ambientAliases: ReadonlyMap<string, FieldDefinition> = new Map(),
  schemaCatalog?: SchemaCatalog,
): DataScope {
  return {
    fields: new Map(fields.map((field) => [field.name, field])),
    aliases: new Map(),
    ambientAliases,
    ...(schemaCatalog ? { schemaCatalog } : {}),
  };
}

function resolveDataPath(path: string, scope: DataScope) {
  const [head, ...parts] = path.split('.');
  if (!head) return undefined;
  let current = scope.aliases.get(head) ?? scope.fields.get(head) ?? scope.ambientAliases.get(head);
  if (!current) return undefined;
  for (const part of parts) {
    const nextField: FieldDefinition | undefined =
      current.items?.fields?.find((field) => field.name === part) ??
      (current.schema ? fieldFromSchema(current.schema, part, scope.schemaCatalog) : undefined);
    if (!nextField) return undefined;
    current = nextField;
  }
  return current;
}

function itemField(field: FieldDefinition, name: string): FieldDefinition | undefined {
  const items = field.items;
  if (!items) return undefined;
  return {
    name,
    type: items.type,
    ...(items.schema ? { schema: items.schema } : {}),
    required: true,
    ...(items.options ? { options: items.options } : {}),
    ...(items.fields ? { items: { type: items.type, fields: items.fields } } : {}),
  };
}

function scalarItemField(name: string): FieldDefinition {
  return { name, type: 'text' };
}

function scopeForObject(field: FieldDefinition, schemaCatalog?: SchemaCatalog): DataScope {
  return {
    fields: new Map(field.items?.fields?.map((item) => [item.name, item]) ?? []),
    aliases: new Map(),
    ambientAliases: new Map(),
    ...(schemaCatalog ? { schemaCatalog } : {}),
  };
}

function fieldFromSchema(
  schema: NonNullable<FieldDefinition['schema']>,
  name: string,
  schemaCatalog?: SchemaCatalog,
) {
  schema = resolveJsonSchema(schema, schemaCatalog);
  const alternatives = schema.oneOf ?? schema.anyOf ?? schema.allOf ?? [schema];
  const branches = alternatives.flatMap((branch) => {
    const property = branch.properties?.[name];
    return property ? [{ branch, property }] : [];
  });
  if (!branches.length) return undefined;
  const schemas = branches.map(({ property }) => property);
  const type = schemas.every((entry) => entry.enum?.every((value) => typeof value === 'string'))
    ? 'enum'
    : schemas.every((entry) => entry.type === 'number' || entry.type === 'integer')
      ? 'number'
      : schemas.every((entry) => entry.type === 'boolean')
        ? 'boolean'
        : schemas.every((entry) => entry.type === 'array')
          ? 'array'
          : schemas.every((entry) => entry.type === 'object' || entry.properties)
            ? 'object'
            : 'text';
  const required = branches.every(({ branch }) => branch.required?.includes(name) === true);
  return {
    name,
    type,
    ...(required ? { required: true } : {}),
    schema: schemas.length === 1 ? schemas[0] : { anyOf: schemas },
    ...(schemas.length === 1 &&
    schemas[0]?.enum?.every((value): value is string => typeof value === 'string')
      ? { options: schemas[0].enum }
      : {}),
  } satisfies FieldDefinition;
}
