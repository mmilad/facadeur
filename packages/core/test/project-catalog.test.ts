import { describe, expect, it } from 'vitest';
import {
  DocumentError,
  emptyProjectCatalog,
  tokenReferenceValue,
  validateProjectCatalog,
} from '../src/index';
import { createExampleCatalog } from '@facadeur/examples';
const testUuid25 = globalThis.crypto.randomUUID();
const testUuid26 = globalThis.crypto.randomUUID();
const testUuid27 = globalThis.crypto.randomUUID();

const imageSchemaUuid = testUuid25;
const imageAtomUuid = testUuid26;
const rootNodeUuid = testUuid27;

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

  it('accepts the shared UUID-keyed token model, including font-family tokens', () => {
    const catalog = validateProjectCatalog(createExampleCatalog());
    const colors = Object.values(catalog.tokens?.color ?? {});
    const fonts = Object.values(catalog.tokens?.font ?? {});

    expect(colors.length).toBeGreaterThan(0);
    expect(fonts.some((font) => font.valueType === 'fontFamily')).toBe(true);
    for (const family of Object.values(catalog.tokens ?? {})) {
      for (const token of Object.values(family)) expect(token.uuid).toBeTruthy();
    }
  });

  it('accepts global styles with breakpoints and a style block', () => {
    const exampleCatalog = createExampleCatalog();
    const accentTokenUuid = Object.values(exampleCatalog.tokens!.color).find(
      (token) => token.group === 'accent',
    )!.uuid;
    const catalog = validateProjectCatalog({
      ...exampleCatalog,
      globalStyles: {
        ...exampleCatalog.globalStyles,
        block: {
          declarations: { backgroundColor: tokenReferenceValue(accentTokenUuid) },
          rules: [
            {
              id: 'base-reset',
              selector: '*, *::before, *::after',
              bindings: {},
              declarations: { boxSizing: 'border-box' },
            },
          ],
        },
        tokenInterface: { reads: [accentTokenUuid] },
      },
    });
    expect(catalog.globalStyles?.block?.rules).toHaveLength(1);
    expect(catalog.globalStyles?.breakpoints).toEqual(exampleCatalog.globalStyles?.breakpoints);
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
