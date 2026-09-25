import { Field } from '../components/feedback/Field.js';
import { TextInput } from '../components/input/TextInput.js';
import { TextArea } from '../components/input/TextArea.js';
import { NumberInput } from '../components/input/NumberInput.js';
import { SearchInput } from '../components/input/SearchInput.js';
import { ColorInput } from '../components/input/ColorInput.js';
import { Select } from '../components/selection/Select.js';
import { Combobox } from '../components/selection/Combobox.js';
import { Toggle } from '../components/selection/Toggle.js';
import { Checkbox } from '../components/selection/Checkbox.js';
import { ArrayField } from '../components/dynamic/ArrayField.js';
import { RecordField } from '../components/dynamic/RecordField.js';
import { Section } from '../components/layout/Section.js';
import type { FieldConfig, FieldGroupConfig } from './field-config.js';

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
        <TextInput name={config.name} placeholder={config.placeholder} disabled={config.disabled} />
      );
    case 'textarea':
      return (
        <TextArea name={config.name} placeholder={config.placeholder} disabled={config.disabled} />
      );
    case 'number':
      return (
        <NumberInput
          name={config.name}
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
          options={config.options}
          placeholder={config.placeholder}
          disabled={config.disabled}
        />
      );
    case 'toggle':
      return <Toggle name={config.name} label={config.label} disabled={config.disabled} />;
    case 'checkbox':
      return <Checkbox name={config.name} label={config.label} disabled={config.disabled} />;
    case 'array':
      return (
        <ArrayField
          name={config.name}
          defaultItem={
            config.defaultItem ??
            (() => (Array.isArray(config.item) ? {} : { [config.item.name]: '' }))
          }
        >
          {(_, __, ___) => (
            <SchemaForm fields={Array.isArray(config.item) ? config.item : [config.item]} />
          )}
        </ArrayField>
      );
    case 'record':
      return (
        <RecordField name={config.name} keyLabel={config.keyLabel} valueLabel={config.valueLabel} />
      );
    default:
      return null;
  }
}
