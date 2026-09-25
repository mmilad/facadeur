import {
  bindingTargets,
  type Binding,
  type BindingTarget,
  type FieldDefinition,
} from '@facadeur/core';
import { Field, Select, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';
import {
  BINDING_TARGET_LABEL,
  bindingFieldOptions,
  bindingNeedsName,
  defaultBinding,
  normalizeBindingTargetChange,
  patchBindingAt,
} from './value.js';

export function BindingsEditorControl({
  bindings,
  fields,
  onChangeBindings,
  onInvalid,
}: {
  bindings: Binding[];
  fields: FieldDefinition[];
  onChangeBindings: (bindings: Binding[]) => void;
  onInvalid?: (message: string) => void;
}) {
  return (
    <Stack gap={12}>
      {fields.length === 0 ? (
        <p className="meta">Define a field on this component before binding it.</p>
      ) : null}
      {bindings.map((binding, index) => (
        <BindingRow
          key={`${binding.field}-${binding.target}-${binding.name ?? ''}-${index}`}
          binding={binding}
          index={index}
          fields={fields}
          onChangeBindings={onChangeBindings}
          bindings={bindings}
          onInvalid={onInvalid}
        />
      ))}
      <button
        type="button"
        className="text-button"
        name="add-binding"
        disabled={fields.length === 0}
        onClick={() => {
          const next = defaultBinding(fields);
          if (!next) return;
          onChangeBindings([...bindings, next]);
        }}
      >
        Add binding
      </button>
    </Stack>
  );
}

function BindingRow({
  bindings,
  binding,
  index,
  fields,
  onChangeBindings,
  onInvalid,
}: {
  bindings: Binding[];
  binding: Binding;
  index: number;
  fields: FieldDefinition[];
  onChangeBindings: (bindings: Binding[]) => void;
  onInvalid?: (message: string) => void;
}) {
  const needsName = bindingNeedsName(binding.target);
  const options = bindingFieldOptions(fields, binding.field);

  function commit(next: Binding | null) {
    onChangeBindings(patchBindingAt(bindings, index, next));
  }

  return (
    <Stack gap={8} className="binding-row">
      <Field label="Field">
        <Select
          name={`binding-field-${index}`}
          value={binding.field}
          options={options.map((field) => ({ value: field.name, label: field.name }))}
          onCommit={(field) => commit({ ...binding, field })}
        />
      </Field>
      <Field label="Target">
        <Select
          name={`binding-target-${index}`}
          value={binding.target}
          options={bindingTargets.map((target) => ({
            value: target,
            label: BINDING_TARGET_LABEL[target],
          }))}
          onCommit={(next) => commit(normalizeBindingTargetChange(binding, next as BindingTarget))}
        />
      </Field>
      {needsName ? (
        <Field label={binding.target === 'attribute' ? 'Attribute' : 'Property'}>
          <TextInput
            name={`binding-name-${index}`}
            value={binding.name ?? ''}
            onCommit={(raw) => {
              const name = raw.trim();
              if (!name) {
                onInvalid?.(`A ${binding.target} binding needs a name`);
                return;
              }
              commit({ field: binding.field, target: binding.target, name });
            }}
          />
        </Field>
      ) : null}
      <button type="button" className="text-button" onClick={() => commit(null)}>
        Remove binding
      </button>
    </Stack>
  );
}
