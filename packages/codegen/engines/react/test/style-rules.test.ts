import { describe, expect, it } from 'vitest';
import { generateReact } from '../src/index';
import type { DocumentFile } from '@facadeur/core';

const fixture: DocumentFile = {
  version: 1,
  id: 'selector-host',
  name: 'Selector host',
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
    name: 'Selector root',
    styleName: 'root',
    children: [
      {
        id: 'group',
        type: 'frame',
        name: 'Filter group',
        styleName: 'group',
        children: [
          { id: 'checkbox', type: 'frame', tag: 'input', name: 'checkbox', styleName: 'checkbox' },
          { id: 'label', type: 'text', name: 'Label', styleName: 'label', text: 'Filter' },
        ],
      },
    ],
  },
};

function styleCss(): string {
  return (
    generateReact({ documents: [fixture] }).ui.find((file) =>
      file.path.endsWith('style.module.css'),
    )?.contents ?? ''
  );
}

describe('authored local style rules', () => {
  it('emits readable module classes and scopes selector groups without changing relationships', () => {
    const files = generateReact({ documents: [fixture] }).ui;
    const css = styleCss();
    const component = files.find((file) => file.path.endsWith('component.tsx'))?.contents ?? '';
    expect(component).toContain('styles["checkbox"]');
    expect(component).toContain('styles["label"]');
    expect(css).toContain('input:checked + .label:where(.root, .root *)');
    expect(css).toContain(':is(.root, .label):not(.group):where(.root, .root *)::before');
    expect(css).toContain('.group:has(.checkbox):where(.root, .root *)');
    expect(css.match(/:where\(\.root, \.root \*\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps sparse state, owner-axis, named-variant, and breakpoint rules scoped to the root', () => {
    const css = styleCss();
    expect(css).toContain('input:checked + .label:where(.root, .root *):hover');
    expect(css).toContain(
      'input:checked + .label:where(.root[data-variant-tone="accent"], .root[data-variant-tone="accent"] *)',
    );
    expect(css).toContain(
      'input:checked + .label:where(.root[data-variant="compact"], .root[data-variant="compact"] *)',
    );
    expect(css).toContain('@media (min-width: 900px)');
    expect(css).toContain('color: teal;');
  });

  it('preserves selector-rule order when rules bind different instances', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'button',
      name: 'Button',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'button' },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'rule-order-host',
      name: 'Rule order host',
      kind: 'component',
      styles: {
        rules: [
          {
            id: 'first-row',
            selector: '.first, .second',
            bindings: { first: 'first', second: 'second' },
            declarations: { color: 'red' },
          },
          {
            id: 'second-row',
            selector: '.second, .first',
            bindings: { second: 'second', first: 'first' },
            declarations: { color: 'blue' },
          },
        ],
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'first', type: 'instance', component: 'button', styleName: 'first' },
          { id: 'second', type: 'instance', component: 'button', styleName: 'second' },
        ],
      },
    };
    const css =
      generateReact({ documents: [host, button] }).ui.find(
        (file) => file.path === 'components/RuleOrderHost/style.module.css',
      )?.contents ?? '';
    const layerStart = css.indexOf('@layer facadeur.instances');
    const first = css.indexOf('color: red;', layerStart);
    const second = css.indexOf('color: blue;', layerStart);
    expect(layerStart).toBeGreaterThanOrEqual(0);
    expect(first).toBeGreaterThan(layerStart);
    expect(second).toBeGreaterThan(first);
    expect(css.indexOf('color: red;', first + 1)).toBe(-1);
  });
});
