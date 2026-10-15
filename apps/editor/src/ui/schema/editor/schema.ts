import type { JsonSchema } from '@facadeur/core';
import type { SelectOption } from '@facadeur/form';

export type SchemaFieldMetadata = {
  title?: string;
  description?: string;
  required: boolean;
};

export type SchemaReferenceChoice = {
  /** Opaque JSON Schema reference supplied and resolved by the host application. */
  ref: string;
  label: string;
  group: string;
};

export type PropertyDraft = {
  name: string;
  metadata: SchemaFieldMetadata;
  kind: string;
  enumValues: string[];
  reference: string;
};

export const scalarKinds: SelectOption[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'null', label: 'Null' },
  { value: 'enum', label: 'String enum' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
  { value: 'reference', label: 'Catalog reference' },
];

export const rootKinds: SelectOption[] = [...scalarKinds];

export const arrayItemKinds: SelectOption[] = scalarKinds.filter((kind) => kind.value !== 'array');

export function kindOf(schema: JsonSchema): string {
  if (schema.$ref) return 'reference';
  if (Array.isArray(schema.enum)) return 'enum';
  return typeof schema.type === 'string' ? schema.type : 'object';
}

export function referencesAsOptions(references: readonly SchemaReferenceChoice[]): SelectOption[] {
  return references.map(({ ref, label, group }) => ({ value: ref, label: `${group} · ${label}` }));
}

export function draftFromSchema(
  name: string,
  schema: JsonSchema,
  required: boolean,
): PropertyDraft {
  return {
    name,
    metadata: {
      title: typeof schema.title === 'string' ? schema.title : '',
      description: typeof schema.description === 'string' ? schema.description : '',
      required,
    },
    kind: kindOf(schema),
    enumValues: Array.isArray(schema.enum) ? schema.enum.map(String) : [],
    reference: typeof schema.$ref === 'string' ? schema.$ref : '',
  };
}

export function schemaFromDraft(draft: PropertyDraft, previous: JsonSchema): JsonSchema {
  const sameKind = kindOf(previous) === draft.kind;
  const kept = sameKind ? previous : { title: previous.title };
  let shape: JsonSchema;
  if (draft.kind === 'reference') shape = draft.reference ? { $ref: draft.reference } : {};
  else if (draft.kind === 'enum') shape = { type: 'string', enum: draft.enumValues };
  else if (draft.kind === 'object') {
    shape = {
      type: 'object',
      properties: sameKind ? (previous.properties ?? {}) : {},
      required: sameKind ? previous.required : undefined,
      additionalProperties: sameKind ? (previous.additionalProperties ?? false) : false,
    };
  } else if (draft.kind === 'array') {
    shape = {
      type: 'array',
      items: sameKind ? (previous.items ?? { type: 'string' }) : { type: 'string' },
    };
  } else shape = { type: draft.kind };

  return {
    ...kept,
    ...shape,
    title: draft.metadata.title?.trim() || undefined,
    description: draft.metadata.description?.trim() || undefined,
  };
}
