import { describe, expect, it } from 'vitest';
import { applyCommand, DocumentError, toFlat, toNested, validateCatalog } from '@facadeur/core';
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
