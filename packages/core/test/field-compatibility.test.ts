import { describe, expect, it } from 'vitest';
import type { FieldDefinition } from '../src/schema/document';
import { compatibleFieldType } from '../src/controller/validation/field-compatibility';

function field(
  name: string,
  type: FieldDefinition['type'],
  extras: Partial<FieldDefinition> = {},
): FieldDefinition {
  return { name, type, ...extras };
}

describe('field binding compatibility', () => {
  it('matches scalar value kinds', () => {
    expect(compatibleFieldType(field('source', 'text'), field('target', 'richText'))).toBe(true);
    expect(compatibleFieldType(field('source', 'text'), field('target', 'number'))).toBe(false);
    expect(compatibleFieldType(field('source', 'boolean'), field('target', 'boolean'))).toBe(true);
  });

  it('accepts source enum options contained by the destination enum', () => {
    expect(
      compatibleFieldType(
        field('source', 'enum', { options: ['small', 'medium'] }),
        field('target', 'enum', { options: ['small', 'medium', 'large'] }),
      ),
    ).toBe(true);
    expect(
      compatibleFieldType(
        field('source', 'enum', { options: ['small', 'large'] }),
        field('target', 'enum', { options: ['small', 'medium'] }),
      ),
    ).toBe(false);
  });

  it('checks array item types recursively when the destination declares items', () => {
    expect(
      compatibleFieldType(
        field('source', 'array', { items: { type: 'number' } }),
        field('target', 'array', { items: { type: 'number' } }),
      ),
    ).toBe(true);
    expect(
      compatibleFieldType(
        field('source', 'array', { items: { type: 'text' } }),
        field('target', 'array', { items: { type: 'number' } }),
      ),
    ).toBe(false);
    expect(compatibleFieldType(field('source', 'array'), field('target', 'array'))).toBe(true);
  });

  it('checks nested object requirements and field kinds', () => {
    const source = field('source', 'object', {
      items: {
        type: 'object',
        fields: [field('title', 'text', { required: true }), field('enabled', 'boolean')],
      },
    });
    const compatible = field('target', 'object', {
      items: {
        type: 'object',
        fields: [field('title', 'text', { required: true }), field('enabled', 'boolean')],
      },
    });
    const requiresMissing = field('target', 'object', {
      items: {
        type: 'object',
        fields: [field('description', 'text', { required: true })],
      },
    });
    const incompatibleKind = field('target', 'object', {
      items: { type: 'object', fields: [field('title', 'number', { required: true })] },
    });

    expect(compatibleFieldType(source, compatible)).toBe(true);
    expect(compatibleFieldType(source, requiresMissing)).toBe(false);
    expect(compatibleFieldType(source, incompatibleKind)).toBe(false);
  });

  it('treats a destination default as satisfying a nested required field', () => {
    expect(
      compatibleFieldType(
        field('source', 'object', {
          items: { type: 'object', fields: [field('title', 'text')] },
        }),
        field('target', 'object', {
          items: {
            type: 'object',
            fields: [field('title', 'text', { required: true, default: 'Untitled' })],
          },
        }),
      ),
    ).toBe(true);
  });
});
