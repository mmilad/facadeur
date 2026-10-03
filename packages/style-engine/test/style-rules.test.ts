import { describe, expect, it } from 'vitest';
import { compileDocument } from '@facadeur/style-engine';
import { appendStyleSelectorSuffix, scopeStyleSelector } from '../src/selectors/scope';

it('keeps quoted commas, escaped quotes and functional arguments intact when adding states', () => {
  const selector = String.raw`[data-label="a,\"b"]:is(.first, .second)::before, .third:has(> .fourth)`;
  expect(appendStyleSelectorSuffix(selector, ':hover')).toBe(
    String.raw`[data-label="a,\"b"]:is(.first, .second):hover::before, .third:has(> .fourth):hover`,
  );
});
import type { DocumentFile } from '@facadeur/core';

const document: DocumentFile = {
  version: 1,
  id: 'preview-host',
  name: 'Preview host',
  kind: 'component',
  variants: [
    { name: 'default' },
    { name: 'compact' },
    { name: 'tone', values: ['plain', 'accent'] },
  ],
  settings: {
    breakpoints: [
      { id: 'phone', minWidth: 390 },
      { id: 'wide', minWidth: 900 },
    ],
  },
  styles: {
    rules: [
      {
        id: 'checked-label',
        selector: 'input:checked + .label, :is(.root, .label):not(.group)::before',
        bindings: { label: 'label', root: 'root', group: 'group' },
        declarations: { color: 'navy' },
        states: { hover: { color: 'blue' } },
        variants: { tone: { accent: { declarations: { color: 'purple' } } } },
        breakpoints: {
          wide: { declarations: { color: 'green' }, states: { hover: { color: 'teal' } } },
        },
      },
      {
        id: 'has-checkbox',
        selector: '.group:has(.checkbox)',
        bindings: { group: 'group', checkbox: 'checkbox' },
        declarations: { border: '1px solid red' },
      },
    ],
  },
  root: {
    id: 'root',
    type: 'frame',
    name: 'Preview root',
    styleName: 'root',
    children: [
      {
        id: 'group',
        type: 'frame',
        name: 'Group',
        styleName: 'group',
        children: [
          { id: 'checkbox', type: 'frame', tag: 'input', name: 'Check', styleName: 'checkbox' },
          { id: 'label', type: 'text', name: 'Label', styleName: 'label' },
        ],
      },
    ],
  },
};

describe('authored style selector compilation', () => {
  const compiled = compileDocument(document);

  it('scopes each selector group and binding to owner-local preview markers', () => {
    const checked = compiled.find((rule) => rule.key === 'preview-host:rule:checked-label:base');
    expect(checked?.selector).toContain(
      '[data-style-node~="preview-host:label"]:where([data-component="preview-host"], [data-component="preview-host"] *)',
    );
    expect(checked?.selector).toContain(
      ':is([data-style-node~="preview-host:root"], [data-style-node~="preview-host:label"]):not([data-style-node~="preview-host:group"]):where([data-component="preview-host"], [data-component="preview-host"] *)::before',
    );
    const has = compiled.find((rule) => rule.key === 'preview-host:rule:has-checkbox:base');
    expect(has?.selector).toContain(':has([data-style-node~="preview-host:checkbox"])');
    expect(has?.selector).toContain('[data-style-node~="preview-host:group"]');
  });

  it('keeps state suffixes on every group and root-axis conditions on the owner', () => {
    const hover = compiled.find(
      (rule) => rule.key === 'preview-host:rule:checked-label:state:hover',
    );
    expect(hover?.selector).toContain(
      ' + [data-style-node~="preview-host:label"]:where([data-component="preview-host"], [data-component="preview-host"] *):hover',
    );
    expect(hover?.selector).toContain('::before');
    expect(hover?.selector.match(/:hover/g)).toHaveLength(2);
    const accent = compiled.find(
      (rule) => rule.key === 'preview-host:rule:checked-label:variant:tone:accent',
    );
    expect(accent?.selector).toContain(
      ':where([data-component="preview-host"][data-variant-tone="accent"], [data-component="preview-host"][data-variant-tone="accent"] *)',
    );
    expect(accent?.selector).not.toContain(
      '[data-style-node~="preview-host:label"][data-variant-tone',
    );
    const compact = compiled.find(
      (rule) =>
        rule.key === 'preview-host:rule:checked-label:base' &&
        rule.selector.includes('[data-variant="compact"]'),
    );
    expect(compact?.selector).toBeDefined();
    expect(compiled.some((rule) => rule.minWidth === 900 && rule.selector.includes(':hover'))).toBe(
      true,
    );
  });
});

describe('selector root scoping', () => {
  it('keeps modern and legacy pseudo-elements terminal after scope and state suffixes', () => {
    expect(scopeStyleSelector('p::before, p:after', '.root')).toBe(
      'p:where(.root, .root *)::before, p:where(.root, .root *):after',
    );
    expect(appendStyleSelectorSuffix('p::before, p:after', ':hover')).toBe(
      'p:hover::before, p:hover:after',
    );
  });
});
