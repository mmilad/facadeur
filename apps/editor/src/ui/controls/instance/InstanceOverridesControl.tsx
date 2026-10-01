import type { FieldDefinition, FieldValue, VariantAxis } from '@facadeur/core';
import { Field, Select, Stack, TextArea, TextInput, Toggle } from '../../form/index.js';
import '../../form/form.css';
import { fieldDisplayLabel } from '../data/field-label.js';
import { parseInstanceFieldValue } from '../data/value.js';
import { FieldBindingsEditorControl } from './FieldBindingsEditorControl.js';

export function InstanceOverridesControl({
  masterName,
  fields,
  variants,
  variantLabels,
  fieldOverrides,
  fieldBindings = undefined,
  dataFields = [],
  variantOverrides,
  onOpenMaster,
  showMasterAction = true,
  onSetField,
  onSetFieldBindings = () => undefined,
  onSetVariant,
  onInvalid,
}: {
  masterName: string;
  fields: FieldDefinition[];
  variants: VariantAxis[];
  variantLabels?: Readonly<Record<string, string>>;
  fieldOverrides: Record<string, FieldValue> | undefined;
  fieldBindings?: Record<string, string> | undefined;
  dataFields?: FieldDefinition[];
  variantOverrides: Record<string, string> | undefined;
  onOpenMaster: () => void;
  showMasterAction?: boolean;
  onSetField: (field: string, value: FieldValue | null) => void;
  onSetFieldBindings?: (value: Record<string, string> | null) => void;
  onSetVariant: (axis: string, value: string | null) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={12}>
      <div className="instance-overrides-card">
        <span className="instance-overrides-kicker">Instance overrides</span>
        <strong>Local to this instance</strong>
        <p>Fields and variant rules here affect only this instance.</p>
        {showMasterAction ? (
          <button
            type="button"
            className="text-button instance-master-button"
            name="open-component"
            onClick={onOpenMaster}
          >
            Edit master · {masterName}
          </button>
        ) : null}
      </div>
      {fields.length ? <h3>Fields</h3> : null}
      {fields.map((field) => (
        <InstanceFieldOverride
          key={field.name}
          field={field}
          override={fieldOverrides?.[field.name]}
          boundPath={fieldBindings?.[field.name]}
          onSetField={(value) => onSetField(field.name, value)}
          onInvalid={onInvalid}
        />
      ))}
      <FieldBindingsEditorControl
        fields={fields}
        dataFields={dataFields}
        bindings={fieldBindings}
        onChange={(next) => {
          for (const fieldName of Object.keys(next ?? {})) {
            if (Object.prototype.hasOwnProperty.call(fieldOverrides ?? {}, fieldName)) {
              onSetField(fieldName, null);
            }
          }
          onSetFieldBindings(next);
        }}
      />
      {variants.length ? <h3>Variants</h3> : null}
      {variants.map((axis) => {
        const current = variantOverrides?.[axis.name] ?? '';
        return (
          <Field key={axis.name} label={axis.name === 'variant' ? 'Variant selection' : axis.name}>
            <Select
              name={`variant-${axis.name}`}
              aria-label={axis.name === 'variant' ? 'Variant selection' : axis.name}
              value={current}
              options={[
                {
                  value: '',
                  label:
                    axis.name === 'variant'
                      ? 'Automatic (use rules)'
                      : `Default (${axis.default ?? axis.values[0]})`,
                },
                ...axis.values.map((value) => ({
                  value,
                  label:
                    axis.name === 'variant'
                      ? (variantLabels?.[value] ?? (value === 'default' ? 'Default' : value))
                      : value,
                })),
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
  boundPath,
  onSetField,
  onInvalid,
}: {
  field: FieldDefinition;
  override: FieldValue | undefined;
  boundPath?: string;
  onSetField: (value: FieldValue | null) => void;
  onInvalid?: (message: string) => void;
}) {
  const disabled = boundPath !== undefined;
  const label = boundPath
    ? `${fieldDisplayLabel(field.name)} · bound to ${boundPath}`
    : fieldDisplayLabel(field.name);
  if (field.type === 'enum' && field.options?.length) {
    const current = typeof override === 'string' ? override : '';
    return (
      <Field label={label}>
        <Select
          name={`field-${field.name}`}
          value={current}
          disabled={disabled}
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
      <Field label={label}>
        <Toggle
          name={`field-${field.name}`}
          label="On"
          value={checked}
          disabled={disabled}
          onCommit={(next) => onSetField(next)}
        />
      </Field>
    );
  }
  if (field.type === 'array' || field.type === 'object') {
    const shown =
      override === undefined || override === null ? '' : JSON.stringify(override, null, 2);
    const placeholder =
      boundPath !== undefined
        ? `Bound to ${boundPath}`
        : field.default === undefined
          ? undefined
          : JSON.stringify(field.default, null, 2);
    return (
      <Field label={label}>
        <TextArea
          name={`field-${field.name}`}
          value={shown}
          placeholder={placeholder}
          rows={4}
          disabled={disabled}
          onCommit={(raw) => {
            try {
              onSetField(raw.trim() === '' ? null : parseInstanceFieldValue(field, raw));
            } catch (error) {
              onInvalid?.(error instanceof Error ? error.message : 'Invalid field');
            }
          }}
        />
      </Field>
    );
  }
  const shown = override === undefined || override === null ? '' : String(override);
  const placeholder =
    boundPath !== undefined
      ? `Bound to ${boundPath}`
      : field.default === undefined
        ? undefined
        : String(field.default);
  return (
    <Field label={label}>
      <TextInput
        name={`field-${field.name}`}
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
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
