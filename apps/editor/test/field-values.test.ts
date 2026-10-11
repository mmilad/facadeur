import { describe, expect, it } from 'vitest';
import type { JsonSchema } from '@facadeur/core';
import { parseFieldValue } from '../src/domain/field-values';

describe('editor field values', () => {
  it('normalizes field defaults and leaves empty strings unset', () => {
    expect(parseFieldValue({ name: 'label', type: 'text' }, '  hello  ')).toBe('  hello  ');
    expect(parseFieldValue({ name: 'label', type: 'text' }, '')).toBeUndefined();
  });

  it('keeps zero and false values instead of treating them as missing', () => {
    expect(parseFieldValue({ name: 'count', type: 'number' }, '0')).toBe(0);
    expect(parseFieldValue({ name: 'enabled', type: 'boolean' }, 'false')).toBe(false);
    expect(parseFieldValue({ name: 'count', type: 'number' }, '   ')).toBeUndefined();
  });

  it('validates nested objects and array item enums recursively', () => {
    const field = {
      name: 'cards',
      type: 'array' as const,
      items: {
        type: 'object' as const,
        fields: [
          { name: 'kind', type: 'enum' as const, options: ['small', 'large'], required: true },
          { name: 'label', type: 'text' as const, required: true },
        ],
      },
    };
    expect(parseFieldValue(field, '[{"kind":"small","label":"Card"}]')).toEqual([
      { kind: 'small', label: 'Card' },
    ]);
    expect(() => parseFieldValue(field, '[{"kind":"other","label":"Card"}]')).toThrow();
    expect(() => parseFieldValue(field, '[{"kind":"small"}]')).toThrow();
    expect(() => parseFieldValue(field, '[{"kind":"small","label":4}]')).toThrow();

    const withDefault = {
      ...field,
      items: {
        ...field.items,
        fields: [
          { name: 'kind' as const, type: 'enum' as const, options: ['small'], required: true },
          { name: 'label' as const, type: 'text' as const, required: true, default: 'Card' },
        ],
      },
    };
    expect(parseFieldValue(withDefault, '[{"kind":"small"}]')).toEqual([{ kind: 'small' }]);
  });

  it('preserves mixed union schemas for array items and object values', () => {
    const itemSchema: JsonSchema = {
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: { label: { type: 'string' } },
          required: ['label'],
          additionalProperties: false,
        },
      ],
    };
    const items = {
      name: 'items',
      type: 'array' as const,
      items: { type: 'object' as const, schema: itemSchema },
    };
    expect(parseFieldValue(items, '["text",{"label":"card"}]')).toEqual([
      'text',
      { label: 'card' },
    ]);
    expect(() => parseFieldValue(items, '["text",{"label":2}]')).toThrow(/JSON Schema contract/);
    expect(() => parseFieldValue(items, '["text",2]')).toThrow(/JSON Schema contract/);

    const props = {
      name: 'props',
      type: 'object' as const,
      schema: {
        anyOf: [
          { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
          { type: 'object', properties: { count: { type: 'number' } }, required: ['count'] },
        ],
      },
    };
    expect(parseFieldValue(props, '{"title":"hello"}')).toEqual({ title: 'hello' });
    expect(parseFieldValue(props, '{"count":2}')).toEqual({ count: 2 });
    expect(() => parseFieldValue(props, '{"count":"two"}')).toThrow(/JSON Schema contract/);
  });

  it('rejects invalid JSON and invalid boolean input', () => {
    expect(() => parseFieldValue({ name: 'data', type: 'object' }, '{')).toThrow(/valid JSON/);
    expect(() => parseFieldValue({ name: 'enabled', type: 'boolean' }, 'nope')).toThrow(
      /true or false/,
    );
    expect(
      parseFieldValue({ name: 'title', type: 'text' }, '  title  ', { trimStrings: true }),
    ).toBe('title');
  });

  it('applies the same structured-value rules to defaults and preview values', () => {
    const field = {
      name: 'counts',
      type: 'array' as const,
      items: { type: 'number' as const },
    };
    for (const raw of ['["2"]', '[null]', '[1e400]', '{}']) {
      expect(() => parseFieldValue(field, raw)).toThrow();
    }
  });
});
