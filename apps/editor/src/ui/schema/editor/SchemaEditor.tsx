import { Form, type FormFieldConfig } from '@facadeur/form';
import type { JsonSchema } from '@facadeur/core';
import { fieldConfig } from './presets';
import { SchemaPropertiesEditor } from './SchemaPropertiesEditor';
import {
  arrayItemKinds,
  kindOf,
  referencesAsOptions,
  rootKinds,
  type SchemaReferenceChoice,
} from './schema';

export type { SchemaReferenceChoice } from './schema';

export type SchemaEditorProps = {
  heading?: string;
  schema: JsonSchema;
  references: readonly SchemaReferenceChoice[];
  onChange: (schema: JsonSchema) => void;
};

export function SchemaEditor({
  heading = 'Schema editor',
  schema,
  references,
  onChange,
}: SchemaEditorProps) {
  const kind = kindOf(schema);
  const referenceOptions = referencesAsOptions(references);
  const rootValue = {
    kind,
    reference: typeof schema.$ref === 'string' ? schema.$ref : '',
    enumValues: Array.isArray(schema.enum) ? schema.enum.map(String) : [],
    itemKind: kindOf(schema.items ?? { type: 'string' }),
    itemReference: typeof schema.items?.$ref === 'string' ? schema.items.$ref : '',
  };
  const availableRootKinds = rootKinds.map((option) =>
    option.value === 'reference' && referenceOptions.length === 0
      ? { ...option, disabled: true }
      : option,
  );
  const availableItemKinds = arrayItemKinds.map((option) =>
    option.value === 'reference' && referenceOptions.length === 0
      ? { ...option, disabled: true }
      : option,
  );
  const rootFields: FormFieldConfig[] = [
    fieldConfig('kind', { title: 'Root type', options: availableRootKinds }),
    ...(kind === 'reference'
      ? [
          fieldConfig('reference', {
            options: referenceOptions,
            placeholder: 'Choose a catalog schema…',
          }),
        ]
      : []),
    ...(kind === 'enum' ? [fieldConfig('enumValues')] : []),
    ...(kind === 'array'
      ? [
          fieldConfig('itemKind', { options: availableItemKinds }),
          ...(rootValue.itemKind === 'reference'
            ? [
                fieldConfig('itemReference', {
                  options: referenceOptions,
                  placeholder: 'Choose a catalog schema…',
                }),
              ]
            : []),
        ]
      : []),
  ];

  const updateRoot = (next: Record<string, unknown>) => {
    const nextKind = String(next.kind ?? kind);
    if (nextKind === 'reference') {
      onChange({
        title: schema.title,
        description: schema.description,
        $ref: String(next.reference || references[0]?.ref || '') || undefined,
      });
    } else if (nextKind === 'enum') {
      onChange({
        title: schema.title,
        description: schema.description,
        type: 'string',
        enum: Array.isArray(next.enumValues) ? next.enumValues : [],
      });
    } else if (nextKind === 'object') {
      onChange({
        title: schema.title,
        description: schema.description,
        type: 'object',
        properties: schema.type === 'object' ? (schema.properties ?? {}) : {},
        required: schema.type === 'object' ? schema.required : undefined,
        additionalProperties:
          schema.type === 'object' ? (schema.additionalProperties ?? false) : false,
      });
    } else if (nextKind === 'array') {
      const itemKind = String(next.itemKind ?? rootValue.itemKind);
      const items =
        itemKind === 'reference'
          ? String(next.itemReference || references[0]?.ref || '')
            ? { $ref: String(next.itemReference || references[0]?.ref) }
            : {}
          : itemKind === 'enum'
            ? { type: 'string', enum: [] }
            : { type: itemKind };
      onChange({ title: schema.title, description: schema.description, type: 'array', items });
    } else {
      onChange({ title: schema.title, description: schema.description, type: nextKind });
    }
  };

  return (
    <section>
      {heading ? <h2>{heading}</h2> : null}
      <Form value={rootValue} fields={rootFields} onChange={(next) => updateRoot(next)} />
      {kind === 'object' ? (
        <SchemaPropertiesEditor
          properties={schema.properties ?? {}}
          required={schema.required ?? []}
          references={referenceOptions}
          onChange={(properties, required) =>
            onChange({
              ...schema,
              type: 'object',
              properties,
              required: required.length ? required : undefined,
              additionalProperties: schema.additionalProperties ?? false,
            })
          }
        />
      ) : null}
      {kind === 'array' && rootValue.itemKind === 'object' ? (
        <SchemaPropertiesEditor
          properties={schema.items?.properties ?? {}}
          required={schema.items?.required ?? []}
          references={referenceOptions}
          onChange={(properties, required) =>
            onChange({
              ...schema,
              type: 'array',
              items: {
                ...schema.items,
                type: 'object',
                properties,
                required: required.length ? required : undefined,
                additionalProperties: schema.items?.additionalProperties ?? false,
              },
            })
          }
        />
      ) : null}
      <details>
        <summary>JSON Schema output</summary>
        <pre>{JSON.stringify(schema, null, 2)}</pre>
      </details>
    </section>
  );
}
