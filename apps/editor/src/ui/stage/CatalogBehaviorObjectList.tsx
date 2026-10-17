'use client';

import { useState } from 'react';
import type { FieldValue, JsonSchemaObject } from '@facadeur/domain';
import { Field } from '../components/feedback';
import { Inline, Stack } from '../components/layout';
import { ArrayField, NumberInput, Select, TextInput, Toggle } from '../controls/form-binding';

export type ItemField = { name: string; type: 'string' | 'number' | 'boolean' };
export type ItemRecord = Record<string, FieldValue>;
const itemFieldTypes = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
];

export function stringListSchema(): JsonSchemaObject {
  return { type: 'array', items: { type: 'string' } };
}

export function objectListSchema(): JsonSchemaObject {
  return {
    type: 'array',
    items: {
      type: 'object',
      properties: { id: { type: 'string' }, label: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    },
  };
}

export function isObjectList(
  value: FieldValue | null,
  schema: JsonSchemaObject | undefined,
): value is ItemRecord[] {
  return Array.isArray(value) && isRecord(schema?.items) && schema.items.type === 'object';
}

function itemFieldsFromSchema(schema: JsonSchemaObject | undefined): ItemField[] {
  if (!isRecord(schema?.items) || !isRecord(schema.items.properties)) return [];
  return Object.entries(schema.items.properties).flatMap(([name, property]) => {
    if (!isRecord(property)) return [];
    const type = property.type;
    if (type !== 'string' && type !== 'number' && type !== 'boolean') return [];
    return [{ name, type }];
  });
}

export function asRecord(value: unknown): ItemRecord {
  if (!isRecord(value)) return {};
  const result: ItemRecord = {};
  for (const [key, item] of Object.entries(value)) {
    if (isFieldValue(item)) result[key] = item;
  }
  return result;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true;
  if (Array.isArray(value)) return value.every(isFieldValue);
  return isRecord(value) && Object.values(value).every(isFieldValue);
}

export function defaultForType(type: ItemField['type']): FieldValue {
  if (type === 'boolean') return false;
  if (type === 'number') return 0;
  return '';
}

function createDefaultItem(
  fields: ItemField[],
  keyPath: string | undefined,
  existing: ItemRecord[],
) {
  const item = Object.fromEntries(fields.map((field) => [field.name, defaultForType(field.type)]));
  return keyPath ? { ...item, [keyPath]: createUniqueKey(existing, keyPath) } : item;
}

export function assignUniqueKeys(items: ItemRecord[], keyPath: string) {
  const used = new Set<string>();
  return items.map((item) => {
    const current = item[keyPath];
    const key =
      typeof current === 'string' && current.trim() && !used.has(current)
        ? current
        : createUniqueKey(
            [...used].map((value) => ({ [keyPath]: value })),
            keyPath,
          );
    used.add(key);
    return { ...item, [keyPath]: key };
  });
}

function createUniqueKey(existing: ItemRecord[], keyPath: string) {
  const used = new Set(
    existing
      .map((item) => item[keyPath])
      .filter((value): value is string => typeof value === 'string'),
  );
  let key = randomKey();
  while (used.has(key)) key = randomKey();
  return key;
}

function randomKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `facadeur-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export function hasUniqueKeys(items: ItemRecord[], keyPath: string) {
  const keys = items.map((item) => item[keyPath]);
  return (
    keys.every((key) => typeof key === 'string' && key.trim().length > 0) &&
    new Set(keys).size === keys.length
  );
}

function nextFieldName(fields: ItemField[]) {
  let index = fields.length + 1;
  while (fields.some((field) => field.name === `field${index}`)) index += 1;
  return `field${index}`;
}

export function isStateName(name: string) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return false;
  return !new Set([
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'null',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]).has(name);
}

export function ObjectListStateEditor({
  name,
  value,
  schema,
  keyPath,
  error,
  onFieldsChange,
  onKeyPathChange,
  onItemsChange,
}: {
  name: string;
  value: FieldValue[];
  schema: JsonSchemaObject | undefined;
  keyPath?: string;
  error?: string;
  onFieldsChange: (fields: ItemField[]) => void;
  onKeyPathChange: (keyPath: string) => void;
  onItemsChange: (items: ItemRecord[]) => void;
}) {
  const fields = itemFieldsFromSchema(schema);
  const [fieldNameDrafts, setFieldNameDrafts] = useState<Record<number, string>>({});
  const stringFields = fields.filter((field) => field.type === 'string');
  const itemValues = value.map(asRecord);
  return (
    <Stack gap="sm">
      <Field label="Item fields">
        <ArrayField<ItemField>
          value={fields}
          defaultItem={() => ({ name: nextFieldName(fields), type: 'string' })}
          rowLabel="Field"
          onChange={onFieldsChange}
        >
          {(field, index, helpers) => (
            <Inline gap="sm" align="center">
              <TextInput
                aria-label={`Field name ${index + 1} for ${name}`}
                value={fieldNameDrafts[index] ?? field.name}
                disabled={field.name === keyPath}
                onChange={(next) =>
                  setFieldNameDrafts((current) => ({ ...current, [index]: next }))
                }
                onCommit={(next) => {
                  const normalized = next.trim();
                  if (
                    !isStateName(normalized) ||
                    fields.some(
                      (item, itemIndex) => itemIndex !== index && item.name === normalized,
                    )
                  ) {
                    setFieldNameDrafts((current) => ({ ...current, [index]: field.name }));
                    return;
                  }
                  onFieldsChange(
                    fields.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: normalized } : item,
                    ),
                  );
                  setFieldNameDrafts((current) => ({ ...current, [index]: normalized }));
                }}
              />
              <Select
                aria-label={`Field type ${field.name} for ${name}`}
                value={field.type}
                disabled={field.name === keyPath}
                options={itemFieldTypes}
                onChange={(type) =>
                  onFieldsChange(
                    fields.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, type: type as ItemField['type'] } : item,
                    ),
                  )
                }
              />
              <button
                type="button"
                disabled={field.type !== 'string' || field.name === keyPath}
                aria-label={`Use ${field.name} as item key for ${name}`}
                aria-pressed={field.name === keyPath}
                onClick={() => onKeyPathChange(field.name)}
              >
                {field.name === keyPath ? 'Key' : 'Use as key'}
              </button>
              <button
                type="button"
                disabled={field.name === keyPath}
                aria-label={`Remove field ${field.name} from ${name}`}
                onClick={helpers.remove}
              >
                Remove field
              </button>
            </Inline>
          )}
        </ArrayField>
      </Field>
      <Field label="Stable item key">
        <Select
          aria-label={`Stable key field for ${name}`}
          value={keyPath ?? ''}
          options={[
            { value: '', label: 'Choose a text field…' },
            ...stringFields.map((field) => ({ value: field.name, label: field.name })),
          ]}
          onChange={onKeyPathChange}
        />
      </Field>
      <Field label="Initial items">
        <ArrayField<ItemRecord>
          value={itemValues}
          defaultItem={() => createDefaultItem(fields, keyPath, itemValues)}
          rowLabel="Item"
          onChange={onItemsChange}
        >
          {(item, index) => (
            <Stack gap="xs">
              {fields.map((field) => (
                <Field key={field.name} label={field.name}>
                  {field.type === 'boolean' ? (
                    <Toggle
                      aria-label={`${field.name} for item ${index + 1} in ${name}`}
                      label={`${field.name}: ${item[field.name] === true ? 'true' : 'false'}`}
                      value={item[field.name] === true}
                      onChange={(next) =>
                        onItemsChange(
                          itemValues.map((current, itemIndex) =>
                            itemIndex === index ? { ...current, [field.name]: next } : current,
                          ),
                        )
                      }
                    />
                  ) : field.type === 'number' ? (
                    <NumberInput
                      aria-label={`${field.name} for item ${index + 1} in ${name}`}
                      value={
                        typeof item[field.name] === 'number' ? (item[field.name] as number) : 0
                      }
                      onChange={(next) =>
                        onItemsChange(
                          itemValues.map((current, itemIndex) =>
                            itemIndex === index ? { ...current, [field.name]: next ?? 0 } : current,
                          ),
                        )
                      }
                    />
                  ) : (
                    <TextInput
                      aria-label={`${field.name} for item ${index + 1} in ${name}`}
                      value={
                        typeof item[field.name] === 'string' ? (item[field.name] as string) : ''
                      }
                      onChange={(next) =>
                        onItemsChange(
                          itemValues.map((current, itemIndex) =>
                            itemIndex === index ? { ...current, [field.name]: next } : current,
                          ),
                        )
                      }
                    />
                  )}
                </Field>
              ))}
            </Stack>
          )}
        </ArrayField>
      </Field>
      {error ? <small className="catalog-behavior-error">{error}</small> : null}
    </Stack>
  );
}
