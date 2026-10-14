'use client';

import type { FieldValue } from '@facadeur/core';
import { Form, TransformableField } from '@facadeur/form';
import type { InspectorSidebarModel } from '../../../../domain/sidebar/types';
import { SchemaValueForm } from '../../../controls/data/schema/SchemaValueForm';

type ConfigField = NonNullable<InspectorSidebarModel['tabs'][number]['configFields']>[number];

export function DefinitionFieldSettings({
  configField,
  onChange,
}: {
  configField: ConfigField;
  onChange: (setting: 'isStatic' | 'value' | 'expose', value: boolean | FieldValue) => void;
}) {
  const { field, isStatic, value, exposed } = configField;
  const formFields = [
    { type: 'boolean' as const, name: 'isStatic', label: 'isStatic' },
    ...(isStatic ? [{ type: 'boolean' as const, name: 'expose', label: 'Expose field' }] : []),
  ];

  return (
    <section className="inspector-config-field" aria-label={configField.label}>
      <h4 className="inspector-config-field-title">{configField.label}</h4>
      <Form
        value={{ isStatic, expose: exposed }}
        fields={formFields}
        onChange={(_, meta) => {
          if (meta.path === 'isStatic' || meta.path === 'expose') {
            onChange(meta.path, meta.next === true);
          }
        }}
      />
      {isStatic ? (
        isTransformable(field.type) ? (
          <TransformableField
            id={`static-field-${configField.instanceUuid ?? 'root'}-${field.name}`}
            name={
              configField.instanceUuid
                ? `definition.instanceFieldConfigs.${configField.instanceUuid}.${field.name}.value`
                : `definition.staticFields.${field.name}.value`
            }
            label="Static value"
            value={typeof value === 'string' ? value : ''}
            fieldOptions={configField.valueOptions}
            onChange={(next) => onChange('value', next)}
          />
        ) : (
          <SchemaValueForm
            schema={field.schema}
            value={value}
            label="Static value"
            onChange={(next) => onChange('value', next)}
          />
        )
      ) : null}
    </section>
  );
}

function isTransformable(type: ConfigField['field']['type']) {
  return (
    type === 'text' ||
    type === 'richText' ||
    type === 'image' ||
    type === 'link' ||
    type === 'token'
  );
}
