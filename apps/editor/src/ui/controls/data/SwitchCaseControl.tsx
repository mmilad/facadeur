import { useEffect, useState } from 'react';
import type { FieldValue } from '@facadeur/core';
import { Field, Select } from '../../form/index.js';
import {
  type ItemChoice,
  caseEnvelope,
  choiceForValue,
  initialDraftForSchema,
  initialValueForSchema,
  makeCaseValue,
  schemaMatches,
  payloadForValue,
} from './item-array-schema.js';
import { SchemaValueForm } from './SchemaValueForm.js';

export function SwitchCaseControl({
  label,
  value,
  choices,
  onCommit,
}: {
  label: string;
  value: FieldValue | undefined;
  choices: readonly ItemChoice[];
  onCommit: (value: FieldValue) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  const signature = JSON.stringify(value);
  useEffect(() => {
    setDraft(value);
    setError('');
  }, [signature]);

  const envelope = draft === undefined ? undefined : caseEnvelope(draft);
  const inferred = draft === undefined ? undefined : choiceForValue(draft, choices);
  const selectedCase = envelope?.type ?? inferred?.caseValue ?? '';
  const selected = choices.find((choice) => choice.caseValue === selectedCase) ?? inferred;
  const caseChoices = choices.filter((choice) => choice.caseValue);

  function commit(choice: ItemChoice, payload: FieldValue) {
    const next = makeCaseValue(choice, payload);
    setDraft(next);
    try {
      onCommit(next);
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'This value does not match the selected case.',
      );
    }
  }

  function selectCase(caseValue: string) {
    const choice = caseChoices.find((candidate) => candidate.caseValue === caseValue);
    if (!choice) return;
    const schema = choice.payloadSchema ?? choice.schema;
    const currentPayload = draft === undefined ? undefined : payloadForValue(draft);
    const payload =
      envelope?.type === caseValue
        ? envelope.props
        : currentPayload !== undefined &&
            (inferred?.caseValue === caseValue || schemaMatches(currentPayload, schema))
          ? currentPayload
          : (initialValueForSchema(schema, true) ?? initialDraftForSchema(schema));
    commit(choice, payload);
  }

  return (
    <section className="switch-case-control" aria-label={label}>
      {caseChoices.length ? (
        <Field label="Type">
          <Select
            aria-label="Type"
            value={selectedCase}
            options={[
              ...(!selectedCase ? [{ value: '', label: 'Choose type' }] : []),
              ...(selectedCase && !caseChoices.some((choice) => choice.caseValue === selectedCase)
                ? [{ value: selectedCase, label: `Missing: ${selectedCase}` }]
                : []),
              ...caseChoices.map((choice) => ({ value: choice.caseValue!, label: choice.label })),
            ]}
            onChange={selectCase}
          />
        </Field>
      ) : (
        <p className="eu-field__hint">No switch cases are available yet.</p>
      )}
      {envelope && !selected ? (
        <p className="eu-field__error" role="alert">
          Unknown case “{envelope.type}”. Choose a type to repair this value.
        </p>
      ) : null}
      {selected ? (
        <SchemaValueForm
          schema={selected.payloadSchema ?? selected.schema}
          value={payloadForValue(draft ?? {})}
          label={label}
          onChange={(payload) => commit(selected, payload)}
        />
      ) : null}
      {error ? (
        <p className="eu-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
