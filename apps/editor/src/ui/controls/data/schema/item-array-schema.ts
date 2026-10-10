import {
  matchesSchemaValue,
  matchingSchemaIndex,
  type FieldValue,
  type JsonSchema,
} from '@facadeur/core';

export type ItemChoice = {
  id: string;
  label: string;
  schema: JsonSchema;
  caseValue?: string;
  payloadSchema?: JsonSchema;
};

export function schemaMatches(value: FieldValue, schema: JsonSchema): boolean {
  return matchesSchemaValue(value, schema);
}

export function choiceForValue(value: FieldValue, choices: readonly ItemChoice[]) {
  const envelope = caseEnvelope(value);
  if (envelope) return choices.find((choice) => choice.caseValue === envelope.type);
  return choices[
    matchingSchemaIndex(
      value,
      choices.map((choice) => choice.payloadSchema ?? choice.schema),
    )
  ];
}

export function choiceForDraft(
  value: FieldValue,
  choiceId: string | undefined,
  choices: readonly ItemChoice[],
) {
  if (caseEnvelope(value)) return choiceForValue(value, choices);
  return choiceForValue(value, choices) ?? choices.find((choice) => choice.id === choiceId);
}

export function caseEnvelope(value: FieldValue): { type: string; props: FieldValue } | undefined {
  if (!isRecord(value) || typeof value.type !== 'string' || !Object.hasOwn(value, 'props'))
    return undefined;
  const props = value.props;
  return isFieldValue(props) ? { type: value.type, props } : undefined;
}

export function payloadForValue(value: FieldValue) {
  return caseEnvelope(value)?.props ?? value;
}

export function makeCaseValue(choice: ItemChoice, payload: FieldValue): FieldValue {
  return choice.caseValue ? { type: choice.caseValue, props: payload } : payload;
}

export function matchesChoice(value: FieldValue, choice: ItemChoice): boolean {
  const envelope = caseEnvelope(value);
  if (choice.caseValue) {
    return envelope?.type === choice.caseValue && matchesSchemaValue(value, choice.schema);
  }
  return matchesSchemaValue(value, choice.schema);
}

/** Build a useful editable value without weakening or rewriting its source schema. */
export function initialValueForSchema(
  schema: JsonSchema,
  includeOptionalFields = false,
): FieldValue | undefined {
  if (
    'default' in schema &&
    isFieldValue(schema.default) &&
    matchesSchemaValue(schema.default, schema)
  )
    return schema.default;
  if ('const' in schema && isFieldValue(schema.const) && matchesSchemaValue(schema.const, schema))
    return schema.const;
  if (schema.enum?.length) {
    const value = schema.enum.find(
      (entry) => isFieldValue(entry) && matchesSchemaValue(entry, schema),
    );
    if (isFieldValue(value)) return value;
  }

  const alternatives = schema.oneOf ?? schema.anyOf;
  if (alternatives?.length) {
    for (const alternative of alternatives) {
      const value = initialValueForSchema(alternative, includeOptionalFields);
      if (value !== undefined && matchesSchemaValue(value, schema)) return value;
    }
    return undefined;
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'object' || schema.properties) {
    const value: Record<string, FieldValue> = {};
    for (const name of includeOptionalFields
      ? Object.keys(schema.properties ?? {})
      : (schema.required ?? [])) {
      const child = schema.properties?.[name];
      if (!child) continue;
      const initial = initialValueForSchema(child, includeOptionalFields);
      if (initial === undefined) {
        if ((schema.required ?? []).includes(name)) return undefined;
        continue;
      }
      value[name] = initial;
    }
    if (matchesSchemaValue(value, schema)) return value;
    return undefined;
  }
  if (type === 'array') {
    const value: FieldValue[] = [];
    return matchesSchemaValue(value, schema) ? value : undefined;
  }
  if (type === 'boolean') return matchesSchemaValue(false, schema) ? false : undefined;
  if (type === 'integer' || type === 'number') {
    const minimum = typeof schema.minimum === 'number' ? schema.minimum : undefined;
    const exclusiveMinimum =
      typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : undefined;
    const candidate = minimum ?? (exclusiveMinimum !== undefined ? exclusiveMinimum + 1 : 0);
    const step =
      typeof schema.multipleOf === 'number' && schema.multipleOf > 0 ? schema.multipleOf : 1;
    for (let offset = 0; offset < 100; offset++) {
      const value = candidate + step * offset;
      if ((type !== 'integer' || Number.isInteger(value)) && matchesSchemaValue(value, schema))
        return value;
    }
    return undefined;
  }
  if (type === 'string') {
    const candidates = [
      '',
      'value',
      'item',
      'a'.repeat(typeof schema.minLength === 'number' ? schema.minLength : 0),
    ];
    return candidates.find((value) => matchesSchemaValue(value, schema));
  }
  return undefined;
}

/** A provisional editable value for constraints that cannot be satisfied without user input. */
export function initialDraftForSchema(schema: JsonSchema): FieldValue {
  if ('default' in schema && isFieldValue(schema.default)) return schema.default;
  if ('const' in schema && isFieldValue(schema.const)) return schema.const;
  if (schema.enum?.length) {
    const value = schema.enum.find(isFieldValue);
    if (isFieldValue(value)) return value;
  }
  const alternatives = schema.oneOf ?? schema.anyOf;
  if (alternatives?.length) return initialDraftForSchema(alternatives[0]!);

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'object' || schema.properties) {
    const value: Record<string, FieldValue> = {};
    for (const [name, child] of Object.entries(schema.properties ?? {})) {
      if ((schema.required ?? []).includes(name)) value[name] = initialDraftForSchema(child);
    }
    return value;
  }
  if (type === 'array') return [];
  if (type === 'boolean') return false;
  if (type === 'integer' || type === 'number') {
    return typeof schema.minimum === 'number' ? schema.minimum : 0;
  }
  if (type === 'string') {
    return 'a'.repeat(typeof schema.minLength === 'number' ? schema.minLength : 0);
  }
  return {};
}

export function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFieldValue);
  return isRecord(value) && Object.values(value).every(isFieldValue);
}

export function setAtPath(
  value: FieldValue,
  path: readonly (string | number)[],
  next: FieldValue | undefined,
): FieldValue {
  if (!path.length) return next ?? value;
  const [head, ...tail] = path;
  if (typeof head === 'number' && Array.isArray(value)) {
    const result = [...value];
    if (tail.length)
      result[head] = setAtPath(result[head] ?? (typeof tail[0] === 'number' ? [] : {}), tail, next);
    else if (next === undefined) result.splice(head, 1);
    else result[head] = next;
    return result;
  }
  if (typeof head === 'string' && isRecord(value)) {
    const result: Record<string, FieldValue> = { ...value } as Record<string, FieldValue>;
    if (tail.length)
      result[head] = setAtPath(result[head] ?? (typeof tail[0] === 'number' ? [] : {}), tail, next);
    else if (next === undefined) delete result[head];
    else result[head] = next;
    return result;
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
