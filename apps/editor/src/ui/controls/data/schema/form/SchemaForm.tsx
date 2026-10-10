import { useId } from 'react';
import { ChipsField, RecordField as FormRecordField } from '@facadeur/form';
import type { TransformableFieldOption } from '@facadeur/form';
import type { FieldValue } from '@facadeur/core';
import { SchemaValueForm } from '../SchemaValueForm';
import { getPath } from '../../../form-binding/schema/path';
import type { FieldDefinition } from '@facadeur/core';
import { PropBindableInput } from '../../../form-binding/components/input/PropBindableInput';
import {
  useDesignPropOptions,
  useFormContext,
  usePathPrefix,
} from '../../../form-binding/FormContext';
import { Field } from '../../../../components/feedback/Field';
import { TextInput } from '../../../form-binding/components/input/TextInput';
import { TextArea } from '../../../form-binding/components/input/TextArea';
import { NumberInput } from '../../../form-binding/components/input/NumberInput';
import { SearchInput } from '../../../form-binding/components/input/SearchInput';
import { ColorInput } from '../../../form-binding/components/input/ColorInput';
import { Select } from '../../../form-binding/components/selection/Select';
import { Combobox } from '../../../form-binding/components/selection/Combobox';
import { Toggle } from '../../../form-binding/components/selection/Toggle';
import { Checkbox } from '../../../form-binding/components/selection/Checkbox';
import { ArrayField } from '../../../form-binding/components/dynamic/ArrayField';
import { Section } from '../../../../components/layout/Section';
import type { FieldConfig, FieldGroupConfig } from './field-config';

export function SchemaForm({ fields }: { fields: (FieldConfig | FieldGroupConfig)[] }) {
  return (
    <>
      {fields.map((field) => {
        if (field.type === 'section') {
          return (
            <Section key={field.title ?? 'section'} title={field.title}>
              <SchemaForm fields={field.fields} />
            </Section>
          );
        }
        return <SchemaField key={field.name} config={field} />;
      })}
    </>
  );
}

function SchemaField({ config }: { config: FieldConfig }) {
  const control = renderControl(config);
  if (config.type === 'schemaField') {
    return control;
  }
  return (
    <Field label={config.label} hint={config.hint} required={config.required} error={undefined}>
      {control}
    </Field>
  );
}

function renderControl(config: FieldConfig) {
  switch (config.type) {
    case 'text':
      return (
        <TextInput
          name={config.name}
          aria-label={config.label}
          placeholder={config.placeholder}
          disabled={config.disabled}
        />
      );
    case 'textarea':
      return (
        <TextArea name={config.name} placeholder={config.placeholder} disabled={config.disabled} />
      );
    case 'number':
      return (
        <NumberInput
          name={config.name}
          aria-label={config.label}
          min={config.min}
          max={config.max}
          step={config.step}
          disabled={config.disabled}
        />
      );
    case 'search':
      return (
        <SearchInput
          name={config.name}
          placeholder={config.placeholder}
          disabled={config.disabled}
        />
      );
    case 'color':
      return <ColorInput name={config.name} disabled={config.disabled} />;
    case 'select':
      return (
        <Select
          name={config.name}
          options={config.options}
          placeholder={config.placeholder}
          disabled={config.disabled}
        />
      );
    case 'combobox':
      return (
        <Combobox
          name={config.name}
          label={config.label}
          options={config.options}
          placeholder={config.placeholder}
          disabled={config.disabled}
        />
      );
    case 'toggle':
      return (
        <Toggle
          name={config.name}
          label={config.label}
          aria-label={config.label}
          disabled={config.disabled}
        />
      );
    case 'checkbox':
      return <Checkbox name={config.name} label={config.label} disabled={config.disabled} />;
    case 'array':
      return (
        <ArrayField
          name={config.name}
          collapsibleRows={config.collapsibleRows}
          rowLabel={config.label}
          defaultItem={
            config.defaultItem ??
            (() => {
              if (Array.isArray(config.item)) return {};
              if (
                config.item.type === 'text' ||
                config.item.type === 'textarea' ||
                config.item.type === 'number' ||
                config.item.type === 'search' ||
                config.item.type === 'color'
              ) {
                return '';
              }
              if (config.item.type === 'toggle' || config.item.type === 'checkbox') return false;
              return { [config.item.name]: '' };
            })()
          }
        >
          {(_, __, ___) =>
            Array.isArray(config.item) ? (
              <SchemaForm fields={config.item} />
            ) : (
              <PrefixScalarField config={config.item} />
            )
          }
        </ArrayField>
      );
    case 'record':
      return <BoundRecordField config={config} />;
    case 'classList':
      return <BoundClassList config={config} />;
    case 'schemaField':
      return <BoundSchemaField config={config} />;
    default:
      return null;
  }
}

function BoundRecordField({ config }: { config: import('./field-config').RecordFieldConfig }) {
  const id = useId();
  const form = useFormContext();
  const propOptions = useDesignPropOptions();
  const valueField: TransformableFieldOption[] = [
    { type: 'text', label: 'Text' },
    ...(config.propBindValues && propOptions.length
      ? [
          {
            type: 'prop' as const,
            label: 'Component props',
            items: propOptions.map(({ ref, name }) => ({ value: ref, label: name })),
          },
        ]
      : []),
  ];
  const raw = getPath(form.value, config.name);
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

  return (
    <FormRecordField
      id={id}
      name={config.name}
      label={config.label}
      value={value as Record<string, string>}
      keyLabel={config.keyLabel}
      valueLabel={config.valueLabel}
      valueField={
        config.propBindValues ? { type: 'transformable', fieldOptions: valueField } : undefined
      }
      onChange={(next) => form.emitChange(config.name, next, { commit: true })}
    />
  );
}

function BoundClassList({ config }: { config: import('./field-config').ClassListFieldConfig }) {
  const id = useId();
  const form = useFormContext();
  const raw = getPath(form.value, config.name);
  const value = Array.isArray(raw) ? raw.map(String) : [];
  return (
    <ChipsField
      id={id}
      name={config.name}
      label={config.label}
      value={value}
      suggestions={config.suggestions}
      placeholder="Add a class…"
      disabled={config.disabled}
      onChange={(next) => form.emitChange(config.name, next, { commit: true })}
    />
  );
}

function BoundSchemaField({ config }: { config: import('./field-config').SchemaFieldConfig }) {
  const form = useFormContext();
  const designPropOptions = useDesignPropOptions();
  const raw = getPath(form.value, config.name);
  const schema = config.field.schema;
  const propBindable = config.propBindable === true && fieldSupportsPropBind(config.field, schema);

  if (propBindable) {
    const textValue =
      raw === undefined || raw === null
        ? ''
        : typeof raw === 'string'
          ? raw
          : typeof raw === 'number' || typeof raw === 'boolean'
            ? String(raw)
            : JSON.stringify(raw);
    return (
      <Field label={config.label} hint={config.hint}>
        <PropBindableInput
          ariaLabel={config.label}
          value={textValue}
          disabled={config.disabled}
          propOptions={designPropOptions}
          kind={config.field.type === 'number' ? 'number' : 'text'}
          showBindToggle={config.propBindable === true}
          onCommit={(next) => form.emitChange(config.name, next, { commit: true })}
        />
      </Field>
    );
  }

  if (!schema) {
    return (
      <PrefixScalarField
        config={{
          type: config.field.type === 'number' ? 'number' : 'text',
          name: config.name,
          label: config.label,
        }}
      />
    );
  }
  return (
    <SchemaValueForm
      schema={schema}
      value={raw as FieldValue | undefined}
      label={config.label}
      onChange={(next) => form.emitChange(config.name, next, { commit: true })}
    />
  );
}

function fieldSupportsPropBind(field: FieldDefinition, schema: FieldDefinition['schema']): boolean {
  if (field.type === 'boolean' || field.type === 'object' || field.type === 'array') return false;
  if (!schema) return field.type === 'text' || field.type === 'number' || field.type === 'enum';
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  return type === 'string' || type === 'number' || type === 'integer' || field.type === 'enum';
}

/** Bind primitive array entries directly at the row path (`tags.0`), not `tags.0.item`. */
function PrefixScalarField({ config }: { config: FieldConfig }) {
  const form = useFormContext();
  const path = usePathPrefix();
  const raw = getPath(form.value, path);

  function write(next: unknown) {
    form.emitChange(path, next, { commit: true });
  }

  return (
    <Field label={config.label} hint={config.hint} required={config.required}>
      {config.type === 'toggle' ? (
        <Toggle
          aria-label={config.label}
          label={config.label}
          value={raw === true}
          disabled={config.disabled}
          onCommit={write}
        />
      ) : config.type === 'number' ? (
        <NumberInput
          aria-label={config.label}
          value={typeof raw === 'number' ? raw : null}
          min={config.min}
          max={config.max}
          step={config.step}
          disabled={config.disabled}
          onCommit={(next) => write(next ?? '')}
        />
      ) : (
        <TextInput
          aria-label={config.label}
          value={typeof raw === 'string' ? raw : raw == null ? '' : String(raw)}
          placeholder={'placeholder' in config ? config.placeholder : undefined}
          disabled={config.disabled}
          onCommit={write}
        />
      )}
    </Field>
  );
}
