import { describe, expect, it } from 'vitest';
import { fieldDefinitionFromDraft, replaceFieldDefault } from '../src/domain/definitions';
import { parseFieldValue } from '../src/domain/field-values';
import { parsePreviewFieldValue } from '../src/domain/preview-data';

describe('editor field values', () => {
  it('keeps legacy default normalization while preserving preview strings', () => {
    expect(
      fieldDefinitionFromDraft({
        name: 'label',
        type: 'text',
        rawDefault: '  hello  ',
        optionsText: '',
      }),
    ).toEqual({ name: 'label', type: 'text', default: 'hello' });
    expect(
      fieldDefinitionFromDraft({
        name: 'empty',
        type: 'text',
        rawDefault: '   ',
        optionsText: '',
      }),
    ).toEqual({ name: 'empty', type: 'text' });
    expect(parsePreviewFieldValue({ name: 'label', type: 'text' }, '  hello  ')).toBe('  hello  ');
    expect(parsePreviewFieldValue({ name: 'label', type: 'text' }, '')).toBe('');
  });

  it('keeps zero and false values instead of treating them as missing', () => {
    expect(parsePreviewFieldValue({ name: 'count', type: 'number' }, '0')).toBe(0);
    expect(parsePreviewFieldValue({ name: 'enabled', type: 'boolean' }, 'false')).toBe(false);
    expect(
      fieldDefinitionFromDraft({
        name: 'enabled',
        type: 'boolean',
        rawDefault: '',
        optionsText: '',
        booleanDefault: false,
      }),
    ).toEqual({ name: 'enabled', type: 'boolean', default: false });
    expect(parsePreviewFieldValue({ name: 'count', type: 'number' }, '   ')).toBeUndefined();
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
    expect(parsePreviewFieldValue(field, '[{"kind":"small","label":"Card"}]')).toEqual([
      { kind: 'small', label: 'Card' },
    ]);
    expect(() => parsePreviewFieldValue(field, '[{"kind":"other","label":"Card"}]')).toThrow();
    expect(() => parsePreviewFieldValue(field, '[{"kind":"small"}]')).toThrow();
    expect(() => parsePreviewFieldValue(field, '[{"kind":"small","label":4}]')).toThrow();

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
    expect(parsePreviewFieldValue(withDefault, '[{"kind":"small"}]')).toEqual([{ kind: 'small' }]);
  });

  it('rejects invalid JSON and invalid boolean input', () => {
    expect(() => parsePreviewFieldValue({ name: 'data', type: 'object' }, '{')).toThrow(
      /valid JSON/,
    );
    expect(() => parsePreviewFieldValue({ name: 'enabled', type: 'boolean' }, 'nope')).toThrow(
      /true or false/,
    );
    expect(
      parseFieldValue({ name: 'title', type: 'text' }, '  title  ', { trimStrings: true }),
    ).toBe('title');
  });

  it('applies the same structured-value rules to legacy defaults and preview values', () => {
    const field = {
      name: 'counts',
      type: 'array' as const,
      items: { type: 'number' as const },
    };
    expect(replaceFieldDefault(field, '[0, 2]').default).toEqual([0, 2]);
    for (const raw of ['["2"]', '[null]', '[1e400]', '{}']) {
      expect(() => replaceFieldDefault(field, raw)).toThrow();
      expect(() => parsePreviewFieldValue(field, raw)).toThrow();
    }
  });
});
