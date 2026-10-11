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
    expect(catalog.icons?.map((icon) => icon.id)).toContain('select');
    for (const family of Object.values(catalog.tokens ?? {})) {
      for (const token of Object.values(family)) expect(token.uuid).toBeTruthy();
    }
  });

  it('migrates legacy token, font, and breakpoint data at the Catalog read boundary', () => {
    const blueUuid = '8e9dc664-3269-4e29-b09c-983fd19a2b10';
    const legacyCatalog = {
      ...createExampleCatalog(),
      tokens: {
        color: {
          blue: {
            $type: 'color',
            500: {
              $value: '#2563eb',
              $extensions: {
                facadeur: {
                  uuid: blueUuid,
                  label: '500',
                  breakpoints: { tablet: '#1d4ed8' },
                  tier: 'primitive',
                },
                vendor: { retained: true },
              },
            },
          },
          accent: {
            $type: 'color',
            Default: { $value: '{color.blue.500}' },
          },
        },
      },
      fonts: [
        {
          id: 'font-inter',
          label: 'Inter',
          family: 'Inter',
          weights: [400, 700],
          source: { type: 'google', family: 'Inter' },
          fallbacks: ['Arial', 'sans-serif'],
        },
      ],
      globalStyles: {
        breakpoints: [
          { id: 'phone', label: 'Phone', minWidth: 375 },
          { id: 'tablet', label: 'Tablet', minWidth: 768 },
        ],
        tokenInterface: {
          reads: ['color.blue.500'],
          sets: { 'color.blue.500': '{color.accent.Default}' },
        },
        block: {
          declarations: { color: '{color.blue.500}' },
          breakpoints: {
            tablet: { declarations: { color: '{color.accent.Default}' } },
          },
        },
      },
    };

    const catalog = validateProjectCatalog(legacyCatalog);
    const migratedAgain = validateProjectCatalog(legacyCatalog);
    const tabletUuid = catalog.globalStyles?.breakpoints?.[1]?.uuid;
    const blue = catalog.tokens?.color[blueUuid];
    const accent = Object.values(catalog.tokens?.color ?? {}).find(
      (token) => token.label === 'Default',
    );
    const font = Object.values(catalog.tokens?.font ?? {})[0];

    expect(blue).toMatchObject({
      uuid: blueUuid,
      group: 'blue',
      label: '500',
      valueType: 'color',
      value: '#2563eb',
      breakpoints: { [tabletUuid!]: '#1d4ed8' },
      extensions: { facadeur: { tier: 'primitive' }, vendor: { retained: true } },
    });
    expect(accent?.value).toBe(tokenReferenceValue(blueUuid));
    expect(font).toMatchObject({
      label: 'Inter',
      group: '',
      valueType: 'fontFamily',
      value: { family: 'Inter', weights: [400, 700], fallbacks: ['Arial', 'sans-serif'] },
    });
    expect(font?.uuid).toBe(Object.values(migratedAgain.tokens?.font ?? {})[0]?.uuid);
    expect(catalog.globalStyles?.breakpoints?.map(({ uuid }) => uuid)).toEqual(
      migratedAgain.globalStyles?.breakpoints?.map(({ uuid }) => uuid),
    );
    expect(catalog.globalStyles?.tokenInterface).toEqual({
      reads: [blueUuid],
      sets: { [blueUuid]: tokenReferenceValue(accent!.uuid) },
    });
    expect(catalog.globalStyles?.block).toEqual({
      declarations: { color: tokenReferenceValue(blueUuid) },
      breakpoints: {
        [tabletUuid!]: { declarations: { color: tokenReferenceValue(accent!.uuid) } },
      },
    });
    expect('fonts' in catalog).toBe(false);
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

  it('validates optional project icon resources', () => {
    const catalog = validateProjectCatalog({
      ...createExampleCatalog(),
      icons: [{ id: 'brand-mark', name: 'Brand mark', category: 'brand', src: '/brand.svg' }],
    });
    expect(catalog.icons).toEqual([
      { id: 'brand-mark', name: 'Brand mark', category: 'brand', src: '/brand.svg' },
    ]);
    expect(() =>
      validateProjectCatalog({ ...createExampleCatalog(), icons: [{ id: 'bad' }] }),
    ).toThrow(DocumentError);
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
