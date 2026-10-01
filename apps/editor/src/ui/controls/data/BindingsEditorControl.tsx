import type { Binding, FieldDefinition } from '@facadeur/core';
import { useMemo } from 'react';
import { Field, Select, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';
import {
  bindingFromSlot,
  type BindingSlot,
  slotForBinding,
  slotsForNode,
} from './binding-slots.js';
import { fieldDisplayLabel } from './field-label.js';
import { bindingFieldOptions, patchBindingAt } from './value.js';

export function BindingsEditorControl({
  bindings,
  fields,
  nodeType,
  tag,
  onChangeBindings,
  onInvalid,
}: {
  bindings: Binding[];
  fields: FieldDefinition[];
  nodeType: 'frame' | 'text' | 'image';
  tag?: string;
  onChangeBindings: (bindings: Binding[]) => void;
  onInvalid?: (message: string) => void;
}) {
  const slots = useMemo(() => slotsForNode(nodeType, tag), [nodeType, tag]);

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
          slots={slots}
          onChangeBindings={onChangeBindings}
          bindings={bindings}
          onInvalid={onInvalid}
        />
      ))}
      <button
        type="button"
        className="text-button"
        name="add-binding"
        disabled={fields.length === 0 || slots.length === 0}
        onClick={() => {
          const field = fields[0];
          const slot = slots[0];
          if (!field || !slot) return;
          onChangeBindings([...bindings, bindingFromSlot(field.name, slot)]);
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
  slots,
  onChangeBindings,
  onInvalid,
}: {
  bindings: Binding[];
  binding: Binding;
  index: number;
  fields: FieldDefinition[];
  slots: BindingSlot[];
  onChangeBindings: (bindings: Binding[]) => void;
  onInvalid?: (message: string) => void;
}) {
  const resolvedSlot = slotForBinding(binding, slots);
  const isCustomSlot =
    resolvedSlot.id === 'attribute:custom' || resolvedSlot.id === 'style:custom';
  const options = bindingFieldOptions(fields, binding.field);

  function commit(next: Binding | null) {
    onChangeBindings(patchBindingAt(bindings, index, next));
  }

  function commitSlot(slot: BindingSlot) {
    if (slot.id === 'attribute:custom' || slot.id === 'style:custom') {
      commit(bindingFromSlot(binding.field, slot, binding.name?.trim() || 'name'));
      return;
    }
    commit(bindingFromSlot(binding.field, slot));
  }

  return (
    <Stack gap={8} className="binding-row">
      <Field label="Field">
        <Select
          name={`binding-field-${index}`}
          value={binding.field}
          options={options.map((field) => ({
            value: field.name,
            label: fieldDisplayLabel(field.name),
          }))}
          onCommit={(field) => commit({ ...binding, field })}
        />
      </Field>
      <Field label="Slot">
        <Select
          name={`binding-slot-${index}`}
          value={resolvedSlot.id}
          options={slots.map((slot) => ({
            value: slot.id,
            label: slot.label,
          }))}
          onCommit={(slotId) => {
            const slot = slots.find((item) => item.id === slotId);
            if (!slot) return;
            commitSlot(slot);
          }}
        />
      </Field>
      {isCustomSlot ? (
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
              commit(bindingFromSlot(binding.field, resolvedSlot, name));
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
