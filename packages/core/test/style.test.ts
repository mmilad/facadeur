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
import design from '../../../examples/project-template.json';

const buttonFile = button as DocumentFile;
const designFile = design as DocumentFile;

describe('style block and auto layout', () => {
  it('round-trips a style block, token interface, and layout', () => {
    const documents = validateCatalog([designFile, buttonFile]);
    const document = documents.find((item) => item.id === 'button');
    if (!document) throw new Error('missing button');
    expect(toNested(toFlat(document))).toEqual(document);
    expect(document.styles?.states?.hover?.background).toBe('{color.accent.hover}');
    expect(document.root.layout?.gap).toBe('{layout.gap}');
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

  it('removes style children for nodes removed by a named variant', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'removed-style-child',
      name: 'Removed style child',
      kind: 'component',
      variants: [{ name: 'default' }, { name: 'minimal', overrides: { removed: ['gone'] } }],
      styles: {
        children: {
          gone: { declarations: { color: 'red' } },
          stay: { declarations: { color: 'green' } },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'gone', type: 'text', text: 'Gone' },
          { id: 'stay', type: 'text', text: 'Stay' },
        ],
      },
    };

    expect(() => validateCatalog([document])).not.toThrow();
    const resolved = resolveVariantDocument(document, 'minimal');
    expect(resolved.styles?.children).toEqual({
      stay: { declarations: { color: 'green' } },
    });
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
        gap: '{layout.gap}',
        width: { mode: 'fixed', size: { unit: '%', value: 50 } },
        breakpoints: { tablet: { gap: '{layout.gap}' } },
      },
    });
    expect(next.nodes.root?.layout).toMatchObject({
      gap: '{layout.gap}',
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
    doc.tokenInterface = { reads: ['space.gap.sm'] };
    expect(() => validateCatalog([designFile, doc])).toThrow(/tokenInterface\.reads/);
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

  it('allows sparse instance-root appearance overrides and resets inheritance', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'button',
      name: 'Button',
      kind: 'atom',
      variants: [{ name: 'default' }, { name: 'compact' }],
      styles: {
        declarations: { color: 'black' },
        variants: { variant: { compact: { declarations: { color: 'navy' } } } },
        children: {
          root: {
            declarations: { color: 'red' },
          },
        },
      },
      settings: {
        breakpoints: [
          { id: 'phone', minWidth: 390 },
          { id: 'wide', minWidth: 900 },
        ],
      },
      root: { id: 'root', type: 'frame', tag: 'button' },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      variants: [{ name: 'default' }, { name: 'compact' }],
      settings: {
        breakpoints: [
          { id: 'phone', minWidth: 390 },
          { id: 'wide', minWidth: 900 },
        ],
      },
      tokenInterface: { reads: ['color.accent'] },
      styles: {
        children: {
          submit: {
            declarations: { color: '{color.accent}' },
            states: { hover: { color: 'white' } },
            variants: { variant: { compact: { declarations: { color: 'purple' } } } },
            breakpoints: { wide: { declarations: { color: 'green' } } },
          },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'submit', type: 'instance', component: 'button' }],
      },
    };

    expect(() => validateCatalog([host, button])).not.toThrow();
    expect(toNested(toFlat(host))).toEqual(host);
    expect(resolveVariantDocument(host, 'compact').styles?.children?.submit).toMatchObject({
      declarations: { color: 'purple' },
      states: { hover: { color: 'white' } },
      breakpoints: { wide: { declarations: { color: 'green' } } },
    });

    const edited = applyCommand(toFlat(host), {
      type: 'setStyleBlock',
      style: { children: { submit: { declarations: { color: 'orange' } } } },
    });
    expect(edited.styles?.children?.submit).toEqual({
      declarations: { color: 'orange' },
    });
    expect(edited.tokenInterface?.reads).toContain('color.accent');

    const reset = applyCommand(edited, { type: 'setStyleBlock', style: null });
    expect(reset.styles).toBeUndefined();
  });
});
