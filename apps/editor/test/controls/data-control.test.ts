import { describe, expect, it } from 'vitest';
import type { Binding, FieldDefinition } from '@facadeur/core';
import {
  bindingFieldOptions,
  defaultBinding,
  normalizeBindingTargetChange,
  parseInstanceFieldValue,
  patchBindingAt,
} from '../../src/ui/controls/data/value.js';
import {
  variantAxisFromValuesText,
  variantAxisWithDefault,
  variantValuesText,
} from '../../src/ui/controls/variants/value.js';

describe('data control helpers', () => {
  it('merges missing binding field into options', () => {
    const fields: FieldDefinition[] = [{ name: 'label', type: 'text' }];
    const options = bindingFieldOptions(fields, 'missing');
    expect(options.map((f) => f.name)).toEqual(['missing', 'label']);
  });

  it('patches bindings at index', () => {
    const bindings: Binding[] = [{ field: 'a', target: 'text' }];
    expect(patchBindingAt(bindings, 0, null)).toEqual([]);
    expect(patchBindingAt(bindings, 0, { field: 'b', target: 'visible' })).toEqual([
      { field: 'b', target: 'visible' },
    ]);
  });

  it('creates default binding from first field', () => {
    expect(defaultBinding([])).toBeNull();
    expect(defaultBinding([{ name: 'x', type: 'text' }])).toEqual({
      field: 'x',
      target: 'text',
    });
  });

  it('normalizes attribute binding target', () => {
    const binding: Binding = { field: 'label', target: 'text' };
    expect(normalizeBindingTargetChange(binding, 'attribute')).toEqual({
      field: 'label',
      target: 'attribute',
      name: 'name',
    });
  });

  it('parses instance field values', () => {
    expect(parseInstanceFieldValue({ name: 'n', type: 'number' }, '3')).toBe(3);
    expect(() => parseInstanceFieldValue({ name: 'n', type: 'number' }, 'x')).toThrow();
  });
});

describe('variants control helpers', () => {
  const axis = { name: 'size', values: ['sm', 'md'], default: 'sm' };

  it('formats and parses values text', () => {
    expect(variantValuesText(axis)).toBe('sm, md');
    const next = variantAxisFromValuesText(axis, 'sm, md, lg');
    expect(next.values).toEqual(['sm', 'md', 'lg']);
    expect(next.default).toBe('sm');
  });

  it('updates default value', () => {
    expect(variantAxisWithDefault(axis, 'md').default).toBe('md');
    expect(variantAxisWithDefault(axis, '').default).toBeUndefined();
  });
});
