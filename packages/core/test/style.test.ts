import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  DocumentError,
  resolveVariantDocument,
  toFlat,
  toNested,
  validateCatalog,
} from '@facadeur/core';
import type { DocumentFile } from '@facadeur/core';
import button from '../../../examples/button.json';

const buttonFile = button as DocumentFile;

describe('style block and auto layout', () => {
  it('round-trips a style block, token interface, and layout', () => {
    const [document] = validateCatalog([buttonFile]);
    if (!document) throw new Error('missing button');
    expect(toNested(toFlat(document))).toEqual(document);
    expect(document.styles?.states?.hover?.background).toBe('{color.accent.hover}');
    expect(document.root.layout?.gap).toBe('{button.gap}');
  });

  it('validates and resolves named variant style layers without copying base styles', () => {
    const source: DocumentFile = {
      version: 1,
      id: 'variant-style',
      name: 'Variant style',
      kind: 'component',
      variants: [{ name: 'compact' }],
      styles: {
        declarations: { color: 'black' },
        variants: {
          variant: {
            compact: {
              declarations: { color: 'red' },
              states: { hover: { color: 'blue' } },
            },
          },
        },
        children: {
          title: {
            declarations: { fontWeight: '400' },
            variants: { variant: { compact: { declarations: { fontWeight: '700' } } } },
          },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'title', type: 'text', tag: 'h2', text: 'Base' }],
      },
    };

    const [document] = validateCatalog([source]);
    if (!document) throw new Error('missing variant style document');
    const resolved = resolveVariantDocument(document, 'compact');

    expect(document.styles?.declarations?.color).toBe('black');
    expect(resolved.styles?.declarations).toEqual({ color: 'red' });
    expect(resolved.styles?.states?.hover).toEqual({ color: 'blue' });
    expect(resolved.styles?.children?.title?.declarations).toEqual({ fontWeight: '700' });
    expect(resolved.styles?.variants?.variant).toBeUndefined();
  });

  it('rejects raw spacing and accepts a token, including per breakpoint', () => {
    const base = toFlat(buttonFile);
    expect(() =>
      applyCommand(base, {
        type: 'setProp',
        nodeId: 'root',
        prop: 'layout',
        value: { gap: '8px' },
      }),
    ).toThrow(DocumentError);
    const next = applyCommand(base, {
      type: 'setProp',
      nodeId: 'root',
      prop: 'layout',
      value: {
        direction: 'row',
        gap: '{button.gap}',
        width: { mode: 'fixed', size: { unit: '%', value: 50 } },
        breakpoints: { tablet: { gap: '{button.gap}' } },
      },
    });
    expect(next.nodes.root?.layout).toMatchObject({
      gap: '{button.gap}',
      width: { mode: 'fixed', size: { unit: '%', value: 50 } },
    });
    expect(() =>
      applyCommand(base, {
        type: 'setStyle',
        nodeId: 'root',
        property: 'padding',
        value: '10px',
      }),
    ).toThrow(/spacing token/);
  });

  it('requires reads to list every token the style block uses', () => {
    const doc = structuredClone(buttonFile);
    doc.tokenInterface = { reads: ['button.gap'] };
    expect(() => validateCatalog([doc])).toThrow(/tokenInterface\.reads/);
  });

  it('replaces the style block through a command', () => {
    const next = applyCommand(toFlat(buttonFile), {
      type: 'setStyleBlock',
      style: {
        declarations: { color: '{color.text.primary}' },
        states: { disabled: { opacity: '0.4' } },
      },
    });
    expect(next.styles).toEqual({
      declarations: { color: '{color.text.primary}' },
      states: { disabled: { opacity: '0.4' } },
    });
  });
});
