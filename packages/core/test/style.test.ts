import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  DocumentError,
  resolveVariantDocument,
  tokenReferenceValue,
  toFlat,
  toNested,
  validateCatalog,
} from '@facadeur/core';
import type { DocumentFile } from '@facadeur/core';
import { createExampleCatalog } from '@facadeur/examples';

const exampleCatalog = createExampleCatalog();
const exampleColorToken = Object.values(exampleCatalog.tokens!.color).find(
  (token) => token.group === 'accent' && token.label === 'Default',
)!;
const exampleTextToken = Object.values(exampleCatalog.tokens!.color).find(
  (token) => token.group === 'text' && token.label === 'Primary',
)!;
const exampleSpacingToken = Object.values(exampleCatalog.tokens!.space).find(
  (token) => token.group === 'gap' && token.label === 'Sm',
)!;
const breakpointUuid = (label: string) => {
  const breakpoint = exampleCatalog.globalStyles?.breakpoints?.find(
    (item) => item.label === label,
  );
  if (!breakpoint) throw new Error(`Example catalog is missing the ${label} breakpoint`);
  return breakpoint.uuid;
};
const accentTokenUuid = exampleColorToken.uuid;
const textPrimaryTokenUuid = exampleTextToken.uuid;
const colorAccentUuid = exampleColorToken.uuid;
const gapSmUuid = exampleSpacingToken.uuid;
const tabletBreakpointUuid = breakpointUuid('Tablet');
const phoneBreakpointUuid = breakpointUuid('Phone');
const wideBreakpointUuid = breakpointUuid('Wide');

const buttonFile: DocumentFile = {
  version: 1,
  id: 'button',
  name: 'Button',
  kind: 'component',
  styles: {
    states: { hover: { background: tokenReferenceValue(accentTokenUuid) } },
  },
  tokenInterface: { reads: [accentTokenUuid] },
  root: { id: 'root', type: 'frame', layout: { gap: '{layout.gap}' } },
};

const designFile: DocumentFile = {
  version: 1,
  id: 'example-design',
  name: 'Example design',
  kind: 'atom',
  tokens: exampleCatalog.tokens,
  settings: { breakpoints: [...(exampleCatalog.globalStyles?.breakpoints ?? [])] },
  root: { id: 'root', type: 'frame' },
};

describe('style block and auto layout', () => {
  it('round-trips a style block, token interface, and layout', () => {
    const documents = validateCatalog([designFile, buttonFile]);
    const document = documents.find((item) => item.id === 'button');
    if (!document) throw new Error('missing button');
    expect(toNested(toFlat(document))).toEqual(document);
    expect(document.styles?.states?.hover?.background).toBe(`{token:${accentTokenUuid}}`);
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
        breakpoints: { [tabletBreakpointUuid]: { gap: '{layout.gap}' } },
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
    doc.tokenInterface = { reads: [gapSmUuid] };
    expect(() => validateCatalog([designFile, doc])).toThrow(/tokenInterface\.reads/);
  });

  it('replaces the style block through a command', () => {
    const next = applyCommand(toFlat(buttonFile), {
      type: 'setStyleBlock',
      style: {
        declarations: { color: `{token:${textPrimaryTokenUuid}}` },
        states: { disabled: { opacity: '0.4' } },
      },
    });
    expect(next.styles).toEqual({
      declarations: { color: `{token:${textPrimaryTokenUuid}}` },
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
          { uuid: phoneBreakpointUuid, label: 'Phone', minWidth: 390 },
          { uuid: wideBreakpointUuid, label: 'Wide', minWidth: 900 },
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
          { uuid: phoneBreakpointUuid, label: 'Phone', minWidth: 390 },
          { uuid: wideBreakpointUuid, label: 'Wide', minWidth: 900 },
        ],
      },
      tokenInterface: { reads: [colorAccentUuid] },
      styles: {
        children: {
          submit: {
            declarations: { color: `{token:${colorAccentUuid}}` },
            states: { hover: { color: 'white' } },
            variants: { variant: { compact: { declarations: { color: 'purple' } } } },
            breakpoints: { [wideBreakpointUuid]: { declarations: { color: 'green' } } },
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
      breakpoints: { [wideBreakpointUuid]: { declarations: { color: 'green' } } },
    });

    const edited = applyCommand(toFlat(host), {
      type: 'setStyleBlock',
      style: { children: { submit: { declarations: { color: 'orange' } } } },
    });
    expect(edited.styles?.children?.submit).toEqual({
      declarations: { color: 'orange' },
    });
    expect(edited.tokenInterface?.reads).toContain(colorAccentUuid);

    const reset = applyCommand(edited, { type: 'setStyleBlock', style: null });
    expect(reset.styles).toBeUndefined();
  });
});
