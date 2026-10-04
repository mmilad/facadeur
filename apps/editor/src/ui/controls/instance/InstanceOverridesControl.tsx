import type { FieldDefinition, FieldValue, VariantAxis } from '@facadeur/core';
import { Field, Select, Stack, Toggle } from '../../form/index.js';
import '../../form/form.css';
import { InstanceFieldOverride } from './InstanceFieldOverride.js';
import { FieldBindingsEditorControl } from './FieldBindingsEditorControl.js';

export function InstanceOverridesControl({
  masterName,
  fields,
  variants,
  variantLabels,
  fieldOverrides,
  fieldBindings = undefined,
  forwardFields = true,
  dataFields = [],
  variantOverrides,
  onOpenMaster,
  showMasterAction = true,
  onSetField,
  onSetFieldBindings = () => undefined,
  onSetForwardFields = () => undefined,
  onSetVariant,
  onInvalid,
}: {
  masterName: string;
  fields: FieldDefinition[];
  variants: VariantAxis[];
  variantLabels?: Readonly<Record<string, string>>;
  fieldOverrides: Record<string, FieldValue> | undefined;
  fieldBindings?: Record<string, string> | undefined;
  /** Same-name public fields from the embedded component flow automatically unless disabled. */
  forwardFields?: boolean;
  dataFields?: FieldDefinition[];
  variantOverrides: Record<string, string> | undefined;
  onOpenMaster: () => void;
  showMasterAction?: boolean;
  onSetField: (field: string, value: FieldValue | null) => void;
  onSetFieldBindings?: (value: Record<string, string> | null) => void;
  onSetForwardFields?: (value: boolean) => void;
  onSetVariant: (axis: string, value: string | null) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={12}>
      <div className="instance-overrides-card">
        <span className="instance-overrides-kicker">Instance overrides</span>
        <strong>Local to this instance</strong>
        <p>
          Field values override this instance in the editor preview. Data bindings supply component
          inputs in generated output.
        </p>
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
      <Field label="Embedded fields">
        <Toggle
          aria-label="Forward matching fields automatically"
          label="Forward matching fields automatically"
          value={forwardFields}
          onCommit={onSetForwardFields}
        />
      </Field>
      <p className="meta">
        {forwardFields
          ? 'Public fields with matching names are supplied by the embedded component.'
          : 'Map each public field to the current data scope below.'}
      </p>
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
      {!forwardFields ? (
        <FieldBindingsEditorControl
          fields={fields}
          dataFields={dataFields}
          bindings={fieldBindings}
          onChange={onSetFieldBindings}
        />
      ) : null}
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
