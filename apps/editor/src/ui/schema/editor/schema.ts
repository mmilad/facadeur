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

export type SchemaReferenceTargetChoice = {
  target: string;
  label: string;
};

export type PropertyDraft = {
  name: string;
  metadata: SchemaFieldMetadata;
  kind: string;
  enumValues: string[];
  reference: string;
  referenceTarget: string;
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
  { value: 'oneOf', label: 'One of' },
  { value: 'anyOf', label: 'Any of' },
  { value: 'reference', label: 'Catalog reference' },
];

export const rootKinds: SelectOption[] = [...scalarKinds];

export const iconReferenceTarget: SchemaReferenceTargetChoice = {
  target: 'icon',
  label: 'Icon',
};

export const componentReferenceTarget: SchemaReferenceTargetChoice = {
  target: 'component',
  label: 'Component',
};

export const arrayItemKinds: SelectOption[] = scalarKinds.filter((kind) => kind.value !== 'array');

export function kindOf(schema: JsonSchema): string {
  if (schema.$ref) return 'reference';
  if (Array.isArray(schema.enum)) return 'enum';
  if (Array.isArray(schema.oneOf)) return 'oneOf';
  if (Array.isArray(schema.anyOf)) return 'anyOf';
  return typeof schema.type === 'string' ? schema.type : 'object';
}

export function initialCompositionBranch(): JsonSchema {
  return { type: 'string' };
}

export function compositionBranches(schema: JsonSchema, kind: 'oneOf' | 'anyOf'): JsonSchema[] {
  const branches = schema[kind] ?? schema[kind === 'oneOf' ? 'anyOf' : 'oneOf'];
  return branches?.length ? branches : [initialCompositionBranch()];
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
    referenceTarget: referenceTargetOf(schema),
  };
}

export function schemaFromDraft(draft: PropertyDraft, previous: JsonSchema): JsonSchema {
  const sameKind = kindOf(previous) === draft.kind;
  const kept = sameKind ? previous : { title: previous.title };
  let shape: JsonSchema;
  if (draft.kind === 'reference') shape = draft.reference ? { $ref: draft.reference } : {};
  else if (draft.kind === 'enum') shape = { type: 'string', enum: draft.enumValues };
  else if (draft.kind === 'string') {
    shape = {
      type: 'string',
      ...(draft.referenceTarget
        ? { 'x-facadeur-reference': { target: draft.referenceTarget } }
        : {}),
    };
  } else if (draft.kind === 'object') {
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
  } else if (draft.kind === 'oneOf' || draft.kind === 'anyOf') {
    shape = { [draft.kind]: compositionBranches(previous, draft.kind) };
  } else shape = { type: draft.kind };

  const result: JsonSchema = {
    ...kept,
    ...shape,
    title: draft.metadata.title?.trim() || undefined,
    description: draft.metadata.description?.trim() || undefined,
  };
  if (draft.kind === 'string' && !draft.referenceTarget) {
    delete result['x-facadeur-reference'];
  }
  return result;
}

function referenceTargetOf(schema: JsonSchema) {
  const reference = schema['x-facadeur-reference'];
  return reference && typeof reference === 'object' && 'target' in reference
    ? String(reference.target ?? '')
    : '';
}
