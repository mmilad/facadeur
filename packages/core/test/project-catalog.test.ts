import { describe, expect, it } from 'vitest';
import {
  DocumentError,
  emptyProjectCatalog,
  validateProjectCatalog,
} from '../src/index';

const imageSchemaUuid = '550e8400-e29b-41d4-a716-446655440001';
const imageAtomUuid = '550e8400-e29b-41d4-a716-446655440002';
const rootNodeUuid = '550e8400-e29b-41d4-a716-446655440003';

describe('validateProjectCatalog', () => {
  it('accepts empty catalog', () => {
    expect(validateProjectCatalog(emptyProjectCatalog())).toEqual({
      atoms: {},
      components: {},
      pages: {},
    });
  });

  it('accepts image atom with schema ref', () => {
    const catalog = validateProjectCatalog({
      atoms: {
        [imageAtomUuid]: {
          uuid: imageAtomUuid,
          name: 'Image',
          kind: 'atom',
          schema: { kind: 'ref', uuid: imageSchemaUuid },
          config: { previewData: { fields: { ratio: '16 / 9', src: '', alt: '' } } },
          root: {
            uuid: rootNodeUuid,
            dom: { tagName: 'img', attributes: { src: '', alt: '' } },
          },
        },
      },
      components: {},
      pages: {},
      schemas: {
        [imageSchemaUuid]: {
          type: 'object',
          required: ['src'],
          properties: {
            src: { type: 'string' },
            alt: { type: 'string' },
            ratio: { type: 'string' },
          },
        },
      },
    });
    expect(catalog.atoms[imageAtomUuid]?.name).toBe('Image');
  });

  it('accepts optional DTCG tokens and font registry', () => {
    const catalog = validateProjectCatalog({
      ...emptyProjectCatalog(),
      tokens: {
        color: {
          brand: { $type: 'color', $value: '#336699' },
        },
      },
      fonts: [
        {
          id: 'sans',
          family: 'Inter',
          weights: [400, 600],
          source: { type: 'google', family: 'Inter' },
          fallbacks: ['system-ui', 'sans-serif'],
        },
      ],
    });
    expect(catalog.tokens?.color).toBeTruthy();
    expect(catalog.fonts).toHaveLength(1);
  });

  it('accepts global styles with breakpoints and a style block', () => {
    const catalog = validateProjectCatalog({
      ...emptyProjectCatalog(),
      globalStyles: {
        breakpoints: [{ id: 'xs', minWidth: 375 }, { id: 'sm', minWidth: 640 }],
        block: {
          declarations: { backgroundColor: '{color.bg.canvas}' },
          rules: [
            {
              id: 'base-reset',
              selector: '*, *::before, *::after',
              bindings: {},
              declarations: { boxSizing: 'border-box' },
            },
          ],
        },
        tokenInterface: { reads: ['color.bg.canvas'] },
      },
    });
    expect(catalog.globalStyles?.block?.rules).toHaveLength(1);
    expect(catalog.globalStyles?.breakpoints).toHaveLength(2);
  });

  it('rejects missing schema ref', () => {
    expect(() =>
      validateProjectCatalog({
        atoms: {
          [imageAtomUuid]: {
            uuid: imageAtomUuid,
            name: 'Image',
            kind: 'atom',
            schema: { kind: 'ref', uuid: imageSchemaUuid },
            root: { uuid: rootNodeUuid, dom: { tagName: 'img' } },
          },
        },
        components: {},
        pages: {},
      }),
    ).toThrow(DocumentError);
  });
});
