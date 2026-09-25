import type { ReactNode } from 'react';
import type { VariantAxis } from '@facadeur/core';
import { useState } from 'react';
import { variantAxisFromDraft } from '../../../definitions.js';
import { Field, Section, Select, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';
import { variantAxisFromValuesText, variantAxisWithDefault, variantValuesText } from './value.js';

export function VariantsEditorControl({
  variants,
  onDefineVariant,
  onRemoveVariant,
  onInvalid,
  renderAxisExtras,
}: {
  variants: VariantAxis[];
  onDefineVariant: (axis: VariantAxis) => void;
  onRemoveVariant: (name: string) => void;
  onInvalid?: (message: string) => void;
  /** Variant style layers for the master root (or node) stay in the parent. */
  renderAxisExtras?: (axis: VariantAxis) => ReactNode;
}) {
  return (
    <Stack gap={12}>
      <p className="meta">Each value can override the style block, including states.</p>
      {variants.map((axis) => (
        <Section key={axis.name} title={axis.name}>
          <Stack gap={8}>
            <Field label="Values">
              <TextInput
                name={`axis-values-${axis.name}`}
                value={variantValuesText(axis)}
                onCommit={(text) => {
                  try {
                    onDefineVariant(variantAxisFromValuesText(axis, text));
                  } catch (error) {
                    onInvalid?.(error instanceof Error ? error.message : 'Invalid variant');
                  }
                }}
              />
            </Field>
            <Field label="Default">
              <Select
                name={`axis-default-${axis.name}`}
                value={axis.default ?? ''}
                options={[
                  { value: '', label: 'First value' },
                  ...axis.values.map((value) => ({ value, label: value })),
                ]}
                onCommit={(next) => onDefineVariant(variantAxisWithDefault(axis, next))}
              />
            </Field>
            {renderAxisExtras?.(axis)}
            <button
              type="button"
              className="text-button"
              name={`remove-axis-${axis.name}`}
              onClick={() => onRemoveVariant(axis.name)}
            >
              Remove axis
            </button>
          </Stack>
        </Section>
      ))}
      <AddVariantAxisForm onDefineVariant={onDefineVariant} onInvalid={onInvalid} />
    </Stack>
  );
}

function AddVariantAxisForm({
  onDefineVariant,
  onInvalid,
}: {
  onDefineVariant: (axis: VariantAxis) => void;
  onInvalid?: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [valuesText, setValuesText] = useState('');

  return (
    <Section title="Add variant axis">
      <Stack gap={8}>
        <Field label="Name">
          <TextInput name="new-axis-name" value={name} placeholder="size" onChange={setName} />
        </Field>
        <Field label="Values">
          <TextInput
            name="new-axis-values"
            value={valuesText}
            placeholder="sm, md, lg"
            onChange={setValuesText}
          />
        </Field>
        <button
          type="button"
          className="text-button"
          name="add-axis"
          onClick={() => {
            try {
              onDefineVariant(variantAxisFromDraft({ name, valuesText }));
              setName('');
              setValuesText('');
            } catch (error) {
              onInvalid?.(error instanceof Error ? error.message : 'Invalid variant');
            }
          }}
        >
          Add axis
        </button>
      </Stack>
    </Section>
  );
}
