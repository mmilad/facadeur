import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  assertStyleSelector,
  bindStyleRuleSelector,
  documentClassNames,
  DocumentError,
  renderStyleRuleSelector,
  resolveVariantDocument,
  selectorClassNames,
  toFlat,
  toNested,
  validateCatalog,
} from '@facadeur/core';
import type { DocumentFile, StyleRule } from '@facadeur/core';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

const tabletBreakpointUuid = fixtureIds.catalog.breakpoints.tablet;

const source: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  styles: {
    rules: [
      {
        id: 'checked-title',
        selector: '.card:checked + .title, :is(.card, .title):not([data-label=".ignored;value"])',
        bindings: { card: 'root', title: 'title' },
        declarations: { color: 'red' },
      },
    ],
  },
  root: {
    id: 'root',
    type: 'frame',
    styleName: 'card',
    children: [{ id: 'title', type: 'text', styleName: 'title', text: 'Title' }],
  },
};

describe('readable style classes and selector rules', () => {
  it('parses nested selector groups and ignores dots in attribute strings', () => {
    const selector = source.styles?.rules?.[0]?.selector;
    expect(selector).toBeTruthy();
    expect(selectorClassNames(selector!)).toEqual(['card', 'title']);
    expect(() => assertStyleSelector(selector!)).not.toThrow();
    expect(() => assertStyleSelector('.card >')).toThrow(DocumentError);
    expect(() => assertStyleSelector('.card??')).toThrow(DocumentError);
    expect(() => assertStyleSelector(':has()')).toThrow(DocumentError);
    expect(() => assertStyleSelector('.card /* .ignored */')).toThrow(DocumentError);
  });

  it('round-trips rule order and rewrites bound names after node renames', () => {
    const [document] = validateCatalog([source]);
    if (!document) throw new Error('missing document');
    const names = documentClassNames(document);
    expect(names).toEqual(
      new Map([
        ['root', 'card'],
        ['title', 'title'],
      ]),
    );
    expect(toNested(toFlat(document))).toEqual(document);

    const rule = document.styles?.rules?.[0];
    if (!rule) throw new Error('missing rule');
    const updated = structuredClone(document);
    updated.root.styleName = 'shell';
    if (updated.root.type !== 'frame' || !updated.root.children?.[0])
      throw new Error('missing title');
    updated.root.children[0].styleName = 'heading';
    const currentNames = documentClassNames(updated);
    expect(() => validateCatalog([updated])).not.toThrow();
    expect(renderStyleRuleSelector(rule, currentNames)).toBe(
      '.shell:checked + .heading, :is(.shell, .heading):not([data-label=".ignored;value"])',
    );
    expect(bindStyleRuleSelector('.shell + .heading', currentNames)).toEqual({
      shell: 'root',
      heading: 'title',
    });
    expect(() => bindStyleRuleSelector('.unknown', currentNames)).toThrow(/Unknown selector class/);
  });

  it('generates stable readable fallbacks and reserves explicit names', () => {
    const file: DocumentFile = {
      ...source,
      styles: undefined,
      root: {
        id: 'root',
        type: 'frame',
        name: 'Renamed UI label',
        children: [
          { id: 'header', type: 'text', name: 'card' },
          { id: 'body', type: 'text', name: 'Card', styleName: 'card' },
        ],
      },
    };
    expect(documentClassNames(file)).toEqual(
      new Map([
        ['root', 'root'],
        ['header', 'card_2'],
        ['body', 'card'],
      ]),
    );
  });

  it('rejects duplicate explicit names and dangling or unbound selectors', () => {
    const duplicate = structuredClone(source);
    if (duplicate.root.type !== 'frame' || !duplicate.root.children?.[0]) throw new Error();
    duplicate.root.children[0].styleName = 'card';
    expect(() => validateCatalog([duplicate])).toThrow(/used by multiple nodes/);

    const unbound: StyleRule = {
      id: 'bad',
      selector: '.missing',
      bindings: {},
    };
    expect(() => validateCatalog([{ ...source, styles: { rules: [unbound] } }])).toThrow(
      /does not bind/,
    );
    const dangling: StyleRule = { id: 'bad', selector: '.title', bindings: { title: 'missing' } };
    expect(() => validateCatalog([{ ...source, styles: { rules: [dangling] } }])).toThrow(
      /missing node/,
    );
    const mismatch: StyleRule = { id: 'bad', selector: '.other', bindings: { other: 'root' } };
    expect(renderStyleRuleSelector(mismatch, documentClassNames(source))).toBe('.card');
  });

  it('renames class properties through setProp and prunes rules on node removal', () => {
    const flat = toFlat(source);
    const renamed = applyCommand(flat, {
      type: 'setProp',
      nodeId: 'title',
      prop: 'styleName',
      value: 'headline',
    });
    expect(renamed.nodes.title?.styleName).toBe('headline');
    expect(() =>
      applyCommand(renamed, {
        type: 'setProp',
        nodeId: 'title',
        prop: 'styleName',
        value: 'card',
      }),
    ).toThrow(/already in use/);
    const removed = applyCommand(flat, { type: 'remove', nodeId: 'title' });
    expect(removed.styles?.rules).toBeUndefined();
  });

  it('validates and prunes rule variants and merges named-preset rule layers', () => {
    const presetDocument: DocumentFile = {
      ...source,
      variants: [{ name: 'compact' }],
      styles: {
        rules: [
          {
            id: 'checked-title',
            selector: '.card + .title',
            bindings: { card: 'root', title: 'title' },
            declarations: { color: 'black' },
          },
        ],
      },
    };
    presetDocument.variants = [
      { name: 'default' },
      {
        name: 'compact',
        overrides: {
          styles: {
            rules: [
              {
                id: 'checked-title',
                selector: '.card + .title',
                bindings: { card: 'root', title: 'title' },
                declarations: { color: 'red' },
              },
            ],
          },
        },
      },
    ];
    const [validated] = validateCatalog([presetDocument]);
    if (!validated) throw new Error('missing preset document');
    expect(resolveVariantColor(validated)).toBe('red');

    const withAxis: DocumentFile = {
      ...source,
      variants: [{ name: 'tone', values: ['quiet', 'loud'] }],
      settings: {
        breakpoints: [
          { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 },
          { uuid: tabletBreakpointUuid, label: 'Tablet', minWidth: 768 },
        ],
      },
      styles: {
        rules: [
          {
            id: 'checked-title',
            selector: '.card + .title',
            bindings: { card: 'root', title: 'title' },
            variants: { tone: { quiet: { declarations: { color: 'blue' } } } },
            breakpoints: { [tabletBreakpointUuid]: { declarations: { color: 'green' } } },
          },
        ],
      },
    };
    const flat = toFlat(withAxis);
    const pruned = applyCommand(flat, { type: 'removeVariant', name: 'tone' });
    expect(pruned.styles?.rules?.[0]?.variants).toBeUndefined();
    expect(pruned.styles?.rules?.[0]?.breakpoints?.[tabletBreakpointUuid]?.declarations).toEqual({
      color: 'green',
    });
  });

  it('checks rule token reads, spacing tokens, variant axes, and breakpoints', () => {
    const withToken: DocumentFile = {
      ...source,
      styles: {
        rules: [
          {
            id: 'token-rule',
            selector: '.card',
            bindings: { card: 'root' },
            declarations: { color: fixtureTokenRef(fixtureIds.tokens.color.text.primary) },
          },
        ],
      },
    };
    expect(() => validateCatalog([withToken])).toThrow(/tokenInterface\.reads/);
    expect(() =>
      validateCatalog([
        {
          ...withToken,
          tokenInterface: { reads: [fixtureIds.tokens.color.text.primary] },
          styles: {
            rules: [
              {
                id: 'spacing-rule',
                selector: '.card',
                bindings: { card: 'root' },
                declarations: { padding: '8px' },
              },
            ],
          },
        },
      ]),
    ).toThrow(/spacing token/);
    expect(() =>
      validateCatalog([
        {
          ...source,
          styles: {
            rules: [
              {
                id: 'variant-rule',
                selector: '.card',
                bindings: { card: 'root' },
                variants: { missing: { quiet: { declarations: { color: 'red' } } } },
              },
            ],
          },
        },
      ]),
    ).toThrow(/unknown variant/);
    expect(() =>
      validateCatalog([
        {
          ...source,
          styles: {
            rules: [
              {
                id: 'breakpoint-rule',
                selector: '.card',
                bindings: { card: 'root' },
                breakpoints: { missing: { declarations: { color: 'red' } } },
              },
            ],
          },
        },
      ]),
    ).toThrow(/unknown breakpoint/);
  });

  it('preserves readable names on instance nodes through flat conversion and commands', () => {
    const instanceFile: DocumentFile = {
      version: 1,
      id: 'owner',
      name: 'Owner',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'control', type: 'instance', component: 'input', styleName: 'control' }],
      },
    };
    expect(toNested(toFlat(instanceFile))).toEqual(instanceFile);
    const updated = applyCommand(toFlat(instanceFile), {
      type: 'setProp',
      nodeId: 'control',
      prop: 'styleName',
      value: 'field-control',
    });
    expect(updated.nodes.control?.styleName).toBe('field-control');
  });
});

function resolveVariantColor(document: DocumentFile): string | undefined {
  const resolved = resolveVariantDocument(document, 'compact');
  return resolved.styles?.rules?.[0]?.declarations?.color;
}
