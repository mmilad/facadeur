import type { ReactNode } from 'react';
import type { FieldValue, JsonSchema } from '@facadeur/core';
import { Field, NumberInput, Popover, Select, Stack, TextInput, Toggle } from '../../form/index.js';
import { IconButton } from '../../form/components/shared/IconButton.js';
import {
  caseEnvelope,
  initialDraftForSchema,
  initialValueForSchema,
  isFieldValue,
  makeCaseValue,
  payloadForValue,
  schemaMatches,
  setAtPath,
  type ItemChoice,
} from './item-array-schema.js';
import './schema-value-form.css';

export function SchemaValueForm({
  schema,
  value,
  label,
  onChange,
}: {
  schema: JsonSchema;
  value: FieldValue | undefined;
  label: string;
  onChange: (value: FieldValue) => void;
}) {
  return renderSchemaValue(
    schema,
    value,
    [],
    (path, next) => {
      const updated = path.length ? setAtPath(value ?? {}, path, next) : (next ?? value ?? {});
      onChange(updated);
    },
    label,
  );
}

function renderSchemaValue(
  schema: JsonSchema,
  value: FieldValue | undefined,
  path: readonly (string | number)[],
  update: (path: readonly (string | number)[], value: FieldValue | undefined) => void,
  key: string,
  required = false,
): ReactNode {
  if (schema.allOf?.length) {
    return (
      <Stack gap={8}>
        {schema.allOf.map((part, index) =>
          renderSchemaValue(part, value, path, update, `${key}-all-${index}`, required),
        )}
      </Stack>
    );
  }
  const alternatives = schema.oneOf ?? schema.anyOf;
  const caseChoices = structuralCaseSchemas(schema);
  if (caseChoices.length) {
    return renderStructuralCase(caseChoices, value, path, update, key, titleForSchema(schema, key));
  }
  if (alternatives?.length) {
    const selectedIndex =
      value === undefined ? -1 : alternatives.findIndex((part) => schemaMatches(value, part));
    const selected = alternatives[Math.max(selectedIndex, 0)]!;
    return (
      <div className="eu-schema-value__union">
        {renderSchemaValue(selected, value, path, update, `${key}-union`, required)}
      </div>
    );
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const title = schema.title || key.split('.').at(-1) || 'Value';
  const hint = schema.description;
  const scalarEnum = schema.enum?.length ? schema.enum.filter(isFieldValue) : undefined;
  if (
    scalarEnum?.length &&
    scalarEnum.every((entry) => !isRecord(entry) && !Array.isArray(entry))
  ) {
    const options = scalarEnum.map((entry, index) => ({
      value: String(index),
      label: String(entry),
    }));
    const selected = scalarEnum.findIndex((entry) => Object.is(entry, value));
    return (
      <Field label={title} hint={hint} required={required}>
        <Select
          aria-label={title}
          value={selected >= 0 ? String(selected) : ''}
          options={options}
          onChange={(raw) => {
            const entry = scalarEnum[Number(raw)];
            if (entry !== undefined) update(path, entry);
          }}
        />
      </Field>
    );
  }

  if (type === 'object' || schema.properties) {
    const object = isRecord(value) ? value : {};
    const requiredNames = new Set(schema.required ?? []);
    return (
      <Stack gap={8}>
        {Object.entries(schema.properties ?? {}).map(([name, child]) => {
          const isRequired = requiredNames.has(name);
          return (
            <div key={`${key}.${name}`} className="eu-schema-value__property">
              {renderSchemaValue(
                child,
                object[name] ?? initialDisplayValue(child),
                [...path, name],
                update,
                `${key}.${name}`,
                isRequired,
              )}
              {!isRequired ? <span className="eu-field__hint">Optional</span> : null}
            </div>
          );
        })}
      </Stack>
    );
  }

  if (type === 'array') {
    const values = Array.isArray(value) ? value : [];
    const itemSchema = schema.items ?? {};
    const itemCases = structuralCaseSchemas(itemSchema);
    const addCase = (choice: StructuralCaseSchema) => {
      const payload =
        initialValueForSchema(choice.payloadSchema, true) ??
        initialDraftForSchema(choice.payloadSchema);
      update([...path, values.length], makeCaseValue(choice, payload));
    };
    return (
      <Field label={title} hint={hint} required={required}>
        <Stack gap={6}>
          {values.map((entry, index) => (
            <div className="eu-schema-value__nested-row" key={`${key}-${index}`}>
              <div className="eu-schema-value__nested-value">
                {renderSchemaValue(itemSchema, entry, [...path, index], update, `${key}.${index}`)}
              </div>
              <IconButton
                label={`Remove ${title} ${index + 1}`}
                onClick={() => update([...path, index], undefined)}
              >
                ×
              </IconButton>
            </div>
          ))}
          {itemCases.length > 1 ? (
            <Popover trigger={<IconButton label={`Add ${title} item`}>+</IconButton>}>
              <div
                className="eu-schema-value__case-options"
                role="menu"
                aria-label={`Choose ${title} item type`}
              >
                {itemCases.map((choice) => (
                  <button
                    key={choice.caseValue}
                    type="button"
                    role="menuitem"
                    className="eu-button"
                    onClick={() => addCase(choice)}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </Popover>
          ) : itemCases.length === 1 ? (
            <IconButton label={`Add ${title} item`} onClick={() => addCase(itemCases[0]!)}>
              +
            </IconButton>
          ) : (
            <IconButton
              label={`Add ${title} item`}
              onClick={() => {
                const initial = initialValueForSchema(itemSchema);
                if (initial !== undefined) update([...path, values.length], initial);
              }}
            >
              +
            </IconButton>
          )}
        </Stack>
      </Field>
    );
  }

  if (type === 'boolean') {
    return (
      <Field label={title} hint={hint} required={required}>
        <Toggle
          label={title}
          aria-label={title}
          value={value === true}
          onChange={(next) => update(path, next)}
        />
      </Field>
    );
  }
  if (type === 'number' || type === 'integer') {
    const step =
      typeof schema.multipleOf === 'number' ? schema.multipleOf : type === 'integer' ? 1 : 'any';
    return (
      <Field label={title} hint={hint} required={required}>
        <NumberInput
          aria-label={title}
          value={typeof value === 'number' ? value : null}
          min={typeof schema.minimum === 'number' ? schema.minimum : undefined}
          max={typeof schema.maximum === 'number' ? schema.maximum : undefined}
          step={step}
          onChange={(next) => update(path, next ?? undefined)}
        />
      </Field>
    );
  }
  if (type === 'string' || typeof value === 'string' || value === undefined) {
    return (
      <Field label={title} hint={hint} required={required}>
        <TextInput
          aria-label={title}
          value={typeof value === 'string' ? value : ''}
          minLength={typeof schema.minLength === 'number' ? schema.minLength : undefined}
          maxLength={typeof schema.maxLength === 'number' ? schema.maxLength : undefined}
          pattern={typeof schema.pattern === 'string' ? schema.pattern : undefined}
          onChange={(next) => update(path, next)}
        />
      </Field>
    );
  }

  return <FallbackValueField title={title} value={value} path={path} update={update} />;
}

interface StructuralCaseSchema extends ItemChoice {
  caseValue: string;
  label: string;
  payloadSchema: JsonSchema;
}

function structuralCaseSchemas(schema: JsonSchema): StructuralCaseSchema[] {
  const alternatives = schema.oneOf ?? schema.anyOf ?? [schema];
  const choices = alternatives.flatMap((branch) => {
    const caseValue = branch.properties?.type?.const;
    const payloadSchema = branch.properties?.props;
    return typeof caseValue === 'string' && payloadSchema
      ? [
          {
            id: caseValue,
            caseValue,
            label: branch.title ?? caseValue,
            schema: branch,
            payloadSchema,
          },
        ]
      : [];
  });
  return choices.length === alternatives.length ? choices : [];
}

function renderStructuralCase(
  choices: readonly StructuralCaseSchema[],
  value: FieldValue | undefined,
  path: readonly (string | number)[],
  update: (path: readonly (string | number)[], value: FieldValue | undefined) => void,
  key: string,
  label: string,
): ReactNode {
  const envelope = value === undefined ? undefined : caseEnvelope(value);
  const rawPayload = value === undefined ? undefined : payloadForValue(value);
  const inferred =
    !envelope && value !== undefined
      ? choices.find((choice) => schemaMatches(value, choice.payloadSchema))
      : undefined;
  const selectedCase = envelope?.type ?? inferred?.caseValue ?? '';
  const selected = choices.find((choice) => choice.caseValue === selectedCase);

  const setCase = (caseValue: string) => {
    const choice = choices.find((candidate) => candidate.caseValue === caseValue);
    if (!choice) return;
    const payload =
      envelope?.type === caseValue
        ? envelope.props
        : rawPayload !== undefined && schemaMatches(rawPayload, choice.payloadSchema)
          ? rawPayload
          : (initialValueForSchema(choice.payloadSchema, true) ??
            initialDraftForSchema(choice.payloadSchema));
    update(path, makeCaseValue(choice, payload));
  };

  return (
    <div className="eu-schema-value__case" aria-label={label}>
      <Field label="Type">
        <Select
          aria-label="Type"
          value={selectedCase}
          options={[
            ...(!selectedCase ? [{ value: '', label: 'Choose type' }] : []),
            ...(selectedCase && !selected
              ? [{ value: selectedCase, label: `Missing: ${selectedCase}` }]
              : []),
            ...choices.map((choice) => ({ value: choice.caseValue, label: choice.label })),
          ]}
          onChange={setCase}
        />
      </Field>
      {envelope && !selected ? (
        <p className="eu-field__error" role="alert">
          Unknown case “{envelope.type}”. Choose a type to repair this value.
        </p>
      ) : null}
      {selected ? (
        <div className="eu-schema-value__payload">
          {renderSchemaValue(
            selected.payloadSchema,
            selectedCase === envelope?.type ? envelope.props : rawPayload,
            [],
            (payloadPath, next) => {
              const payload = payloadPath.length
                ? setAtPath(rawPayload ?? {}, payloadPath, next)
                : (next ?? rawPayload ?? {});
              update(path, makeCaseValue(selected, payload));
            },
            `${key}.props`,
          )}
        </div>
      ) : null}
    </div>
  );
}

function titleForSchema(schema: JsonSchema, key: string) {
  return schema.title || key.split('.').at(-1) || 'Value';
}

function FallbackValueField({
  title,
  value,
  path,
  update,
}: {
  title: string;
  value: FieldValue;
  path: readonly (string | number)[];
  update: (path: readonly (string | number)[], value: FieldValue | undefined) => void;
}) {
  return (
    <Field label={title}>
      <TextInput
        aria-label={title}
        value={JSON.stringify(value)}
        onCommit={(raw) => {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (isFieldValue(parsed)) update(path, parsed);
          } catch {
            // Leave an unsupported schema's JSON draft unchanged until it parses.
          }
        }}
      />
    </Field>
  );
}

function initialDisplayValue(schema: JsonSchema): FieldValue | undefined {
  if ('default' in schema && isFieldValue(schema.default)) return schema.default;
  if ('const' in schema && isFieldValue(schema.const)) return schema.const;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'boolean') return false;
  if (type === 'number' || type === 'integer') return 0;
  return undefined;
}

function isRecord(value: FieldValue | undefined): value is Record<string, FieldValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
