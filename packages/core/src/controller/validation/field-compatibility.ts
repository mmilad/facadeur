import type { FieldDefinition } from '../../schema/document';

export function compatibleFieldType(
  source: FieldDefinition,
  destination: FieldDefinition,
): boolean {
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
): boolean {
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

function fieldValueKind(type: FieldDefinition['type']) {
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'array';
  if (type === 'object') return 'object';
  return 'string';
}
