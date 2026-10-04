import { DocumentError } from '../../document/errors.js';
import { type FlatDocument, toNested, type FlatNode } from '../../document/flat.js';
import { type FieldDefinition } from '../../document/schema.js';
import { variantPresets } from '../variants/resolve.js';
import { assertValueMatches } from './assertions.js';
import { publicFieldsFor } from './catalog-exposed.js';
import type { SchemaResolverContext } from './types.js';
import { localContractFieldsFor } from './schema-use.js';

interface DataScope {
  fields: ReadonlyMap<string, FieldDefinition>;
  aliases: ReadonlyMap<string, FieldDefinition>;
}

export function validateDataContracts(doc: FlatDocument, context: SchemaResolverContext) {
  const fields = localContractFieldsFor(doc, context.schemaCatalog);
  for (const [name, definition] of publicFieldsFor(doc, context)) {
    if (!fields.has(name)) fields.set(name, definition);
  }
  const visit = (id: string, scope: DataScope) => {
    const node = doc.nodes[id];
    if (!node) return;

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
        if (destination) {
          assertFieldBinding(source, destination, node, field, path);
        }
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
          scopeForObject(item),
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
      };
    }
    for (const childId of node.children) visit(childId, childScope);
  };

  visit(doc.rootId, { fields, aliases: new Map() });
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
    throw new DocumentError('unknown-field', `Data path "${path}" in ${context} is not defined`);
  }
  return field;
}

function resolveDataPath(path: string, scope: DataScope) {
  const [head, ...parts] = path.split('.');
  if (!head) return undefined;
  let current = scope.aliases.has(head) ? scope.aliases.get(head) : scope.fields.get(head);
  if (!current) return undefined;
  for (const part of parts) {
    const nextField: FieldDefinition | undefined = current.items?.fields?.find(
      (field) => field.name === part,
    );
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
    required: true,
    ...(items.options ? { options: items.options } : {}),
    ...(items.fields ? { items: { type: items.type, fields: items.fields } } : {}),
  };
}

function scalarItemField(name: string): FieldDefinition {
  return { name, type: 'text' };
}

function scopeForObject(field: FieldDefinition): DataScope {
  return {
    fields: new Map(field.items?.fields?.map((item) => [item.name, item]) ?? []),
    aliases: new Map(),
  };
}
