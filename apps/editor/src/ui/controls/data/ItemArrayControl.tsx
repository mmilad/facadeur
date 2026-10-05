import { useEffect, useRef, useState } from 'react';
import { type FieldValue } from '@facadeur/core';
import { Field, Popover, Select, Stack } from '../../form/index.js';
import { IconButton } from '../../form/components/shared/IconButton.js';
import { SchemaValueForm } from './SchemaValueForm.js';
import './item-array.css';
import {
  choiceForValue,
  choiceForDraft,
  caseEnvelope,
  initialDraftForSchema,
  initialValueForSchema,
  makeCaseValue,
  matchesChoice,
  payloadForValue,
  schemaMatches,
  setAtPath,
  type ItemChoice,
} from './item-array-schema.js';

type ItemArrayControlProps = {
  label: string;
  value: FieldValue | undefined;
  choices: readonly ItemChoice[];
  onCommit: (value: FieldValue[]) => void;
};

type DraftItem = { key: number; value: FieldValue; choiceId?: string };

let nextItemKey = 0;

export function ItemArrayControl({ label, value, choices, onCommit }: ItemArrayControlProps) {
  const incoming = Array.isArray(value) ? value : [];
  const incomingSignature = JSON.stringify(incoming);
  const [items, setItems] = useState<DraftItem[]>(() => toDrafts(incoming, choices));
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const lastIncoming = useRef(incomingSignature);
  const lastEmitted = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (lastIncoming.current === incomingSignature) return;
    lastIncoming.current = incomingSignature;
    if (lastEmitted.current === incomingSignature) {
      lastEmitted.current = undefined;
      return;
    }
    lastEmitted.current = undefined;
    setItems(toDrafts(incoming, choices));
    setError('');
  }, [incomingSignature]);

  function commit(next: DraftItem[]) {
    setItems(next);
    const normalized = next.map((item) => {
      const choice = choiceForDraft(item.value, item.choiceId, choices);
      if (!choice) return item;
      return {
        ...item,
        choiceId: choice.id,
        value: makeCaseValue(choice, payloadForValue(item.value)),
      };
    });
    const invalidIndex = normalized.findIndex((item) => {
      const choice = choiceForValue(item.value, choices);
      return !choice || !matchesChoice(item.value, choice);
    });
    if (invalidIndex >= 0) {
      setError(`Item ${invalidIndex + 1} does not match an available item schema.`);
      return;
    }
    try {
      const values = normalized.map((item) => item.value);
      onCommit(values);
      lastEmitted.current = JSON.stringify(values);
      setItems(
        normalized.map((item) => ({ ...item, choiceId: choiceForValue(item.value, choices)?.id })),
      );
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'This value does not match the item schema.',
      );
    }
  }

  function add(choice: ItemChoice) {
    const payloadSchema = choice.payloadSchema ?? choice.schema;
    const validInitial = initialValueForSchema(payloadSchema, true);
    const payload = validInitial ?? initialDraftForSchema(payloadSchema);
    const initial = makeCaseValue(choice, payload);
    commit([...items, { key: nextItemKey++, value: initial, choiceId: choice.id }]);
    setPickerOpen(false);
  }

  function changeType(index: number, caseValue: string) {
    const item = items[index];
    const choice = choices.find((candidate) => candidate.caseValue === caseValue);
    if (!item || !choice) return;
    const current = caseEnvelope(item.value);
    const currentChoice = choiceForDraft(item.value, item.choiceId, choices);
    const payloadSchema = choice.payloadSchema ?? choice.schema;
    const currentPayload = payloadForValue(item.value);
    const payload =
      current && current.type === caseValue
        ? current.props
        : currentChoice?.caseValue === caseValue
          ? currentPayload
          : schemaMatches(currentPayload, payloadSchema)
            ? currentPayload
            : (initialValueForSchema(payloadSchema, true) ?? initialDraftForSchema(payloadSchema));
    const next = { ...item, choiceId: choice.id, value: makeCaseValue(choice, payload) };
    commit(items.map((entry, itemIndex) => (itemIndex === index ? next : entry)));
  }

  function editItem(
    index: number,
    path: readonly (string | number)[],
    next: FieldValue | undefined,
  ) {
    const item = items[index];
    if (!item) return;
    const choice = choiceForDraft(item.value, item.choiceId, choices);
    const updated = setAtPath(payloadForValue(item.value), path, next);
    const value = choice ? makeCaseValue(choice, updated) : updated;
    commit(items.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item)));
  }

  function addButton() {
    if (!choices.length) {
      return (
        <IconButton label="Add item" disabled>
          +
        </IconButton>
      );
    }
    if (choices.length === 1) {
      return (
        <IconButton label="Add item" onClick={() => add(choices[0]!)}>
          +
        </IconButton>
      );
    }
    return (
      <Popover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        trigger={<IconButton label="Add item">+</IconButton>}
      >
        <div className="eu-item-array__choices" role="menu" aria-label="Choose item type">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              role="menuitem"
              className="eu-button"
              onClick={() => add(choice)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </Popover>
    );
  }

  return (
    <section className="eu-item-array" aria-label={label}>
      <div className="eu-item-array__header">
        <span className="eu-field__label">{label}</span>
        {addButton()}
      </div>
      {!choices.length ? (
        <p className="eu-field__hint">No target items are available for this repeater.</p>
      ) : null}
      <Stack gap={8}>
        {items.map(({ key, value: item, choiceId }, index) => {
          const choice = choiceForDraft(item, choiceId, choices);
          const schema = choice?.payloadSchema ?? choice?.schema;
          const currentEnvelope = caseEnvelope(item);
          const selectedCase = currentEnvelope?.type ?? choice?.caseValue ?? '';
          const caseOptions = choices.filter((candidate) => candidate.caseValue);
          return (
            <article
              className="eu-item-array__card"
              key={key}
              role="group"
              aria-label={`${choice?.label ?? 'Item'} item ${index + 1}`}
            >
              <div className="eu-item-array__card-header">
                <strong>{choice?.label ?? `Item ${index + 1}`}</strong>
                <IconButton
                  label={`Remove item ${index + 1}`}
                  onClick={() => commit(items.filter((_, itemIndex) => itemIndex !== index))}
                >
                  ×
                </IconButton>
              </div>
              {caseOptions.length ? (
                <Field label="Type">
                  <Select
                    aria-label="Type"
                    value={selectedCase}
                    options={[
                      ...(selectedCase &&
                      !caseOptions.some((candidate) => candidate.caseValue === selectedCase)
                        ? [{ value: selectedCase, label: `Missing: ${selectedCase}` }]
                        : []),
                      ...caseOptions.map((candidate) => ({
                        value: candidate.caseValue!,
                        label: candidate.label,
                      })),
                    ]}
                    onChange={(next) => changeType(index, next)}
                  />
                </Field>
              ) : null}
              {currentEnvelope && !choice ? (
                <p className="eu-field__error">
                  Unknown case “{currentEnvelope.type}”. Choose a type to repair this item.
                </p>
              ) : null}
              {schema ? (
                <SchemaValueForm
                  schema={schema}
                  value={payloadForValue(item)}
                  label={`${label}-${index}`}
                  onChange={(next) => editItem(index, [], next)}
                />
              ) : null}
              {!choice ? (
                <p className="eu-field__error">
                  This item does not match any available item schema.
                </p>
              ) : null}
            </article>
          );
        })}
      </Stack>
      {error ? (
        <p className="eu-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function toDrafts(value: readonly FieldValue[], choices: readonly ItemChoice[]): DraftItem[] {
  return value.map((item) => ({
    key: nextItemKey++,
    value: item,
    choiceId: choiceForValue(item, choices)?.id,
  }));
}
