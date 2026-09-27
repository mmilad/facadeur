import type { FieldDefinition, FieldValue, VariantAxis } from '@facadeur/core';
import { Field, Select, Stack, TextInput, Toggle } from '../../form/index.js';
import '../../form/form.css';
import { parseInstanceFieldValue } from '../data/value.js';

export function InstanceOverridesControl({
  masterName,
  fields,
  variants,
  fieldOverrides,
  variantOverrides,
  onOpenMaster,
  onSetField,
  onSetVariant,
  onInvalid,
}: {
  masterName: string;
  fields: FieldDefinition[];
  variants: VariantAxis[];
  fieldOverrides: Record<string, FieldValue> | undefined;
  variantOverrides: Record<string, string> | undefined;
  onOpenMaster: () => void;
  onSetField: (field: string, value: FieldValue | null) => void;
  onSetVariant: (axis: string, value: string | null) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={12}>
      <div className="instance-overrides-card">
        <span className="instance-overrides-kicker">Instance overrides</span>
        <strong>Local to this instance</strong>
        <p>Fields and variants here affect only this instance.</p>
        <button
          type="button"
          className="text-button instance-master-button"
          name="open-component"
          onClick={onOpenMaster}
        >
          Edit master · {masterName}
        </button>
      </div>
      {fields.length ? <h3>Fields</h3> : null}
      {fields.map((field) => (
        <InstanceFieldOverride
          key={field.name}
          field={field}
          override={fieldOverrides?.[field.name]}
          onSetField={(value) => onSetField(field.name, value)}
          onInvalid={onInvalid}
        />
      ))}
      {variants.length ? <h3>Variants</h3> : null}
      {variants.map((axis) => {
        const current = variantOverrides?.[axis.name] ?? '';
        return (
          <Field key={axis.name} label={axis.name}>
            <Select
              name={`variant-${axis.name}`}
              value={current}
              options={[
                { value: '', label: `Default (${axis.default ?? axis.values[0]})` },
                ...axis.values.map((value) => ({ value, label: value })),
              ]}
              onCommit={(next) => onSetVariant(axis.name, next || null)}
            />
          </Field>
        );
      })}
      {!fields.length && !variants.length ? (
        <p className="meta instance-overrides-empty">
          This component exposes no fields or variants yet.
        </p>
      ) : null}
    </Stack>
  );
}

function InstanceFieldOverride({
  field,
  override,
  onSetField,
  onInvalid,
}: {
  field: FieldDefinition;
  override: FieldValue | undefined;
  onSetField: (value: FieldValue | null) => void;
  onInvalid?: (message: string) => void;
}) {
  if (field.type === 'enum' && field.options?.length) {
    const current = typeof override === 'string' ? override : '';
    return (
      <Field label={field.name}>
        <Select
          name={`field-${field.name}`}
          value={current}
          options={[
            {
              value: '',
              label: `Default (${field.default === undefined ? 'none' : String(field.default)})`,
            },
            ...field.options.map((option) => ({ value: option, label: option })),
          ]}
          onCommit={(next) => onSetField(next || null)}
        />
      </Field>
    );
  }
  if (field.type === 'boolean') {
    const checked = typeof override === 'boolean' ? override : field.default === true;
    return (
      <Field label={field.name}>
        <Toggle
          name={`field-${field.name}`}
          label="On"
          value={checked}
          onCommit={(next) => onSetField(next)}
        />
      </Field>
    );
  }
  const shown = override === undefined || override === null ? '' : String(override);
  const placeholder = field.default === undefined ? undefined : String(field.default);
  return (
    <Field label={field.name}>
      <TextInput
        name={`field-${field.name}`}
        value={shown}
        placeholder={placeholder}
        onCommit={(raw) => {
          try {
            onSetField(raw === '' ? null : parseInstanceFieldValue(field, raw));
          } catch (error) {
            onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
          }
        }}
      />
    </Field>
  );
}
