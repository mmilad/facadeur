import { describe, expect, it } from 'vitest';
import { generateReact } from '@facadeur/codegen-react';
import type { DocumentFile } from '@facadeur/core';

describe('instance-root appearance codegen', () => {
  it('exports containing-document instance rules with states, variants, tokens, and breakpoints', () => {
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
          button: {
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
        children: [{ id: 'button', type: 'instance', component: 'control' }],
      },
    };
    const css =
      generateReact({ documents: [host] }).ui.find((file) => file.path.endsWith('style.module.css'))
        ?.contents ?? '';
    expect(css).toContain('@layer facadeur.instances');
    expect(css).toMatch(
      /\.f_root_[a-z0-9]+ > \[data-node="button"\]\[data-component="control"\]\[data-component="control"\] \{/,
    );
    expect(css).toContain('color: var(--color-accent);');
    expect(css).toMatch(
      /\.f_root_[a-z0-9]+ > \[data-node="button"\]\[data-component="control"\]\[data-component="control"]:hover/,
    );
    expect(css).toMatch(
      /\.f_root_[a-z0-9]+\[data-variant="compact"\] > \[data-node="button"\]\[data-component="control"\]\[data-component="control"\]/,
    );
    expect(css).toContain('@media (min-width: 900px)');
    expect(css).toContain('color: green;');
  });

  it('drops the instance rule when inheritance is reset', () => {
    const host: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      styles: { children: { button: { declarations: { color: 'orange' } } } },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'button', type: 'instance', component: 'control' }],
      },
    };
    const reset = { ...host, styles: undefined };
    const css =
      generateReact({ documents: [reset] }).ui.find((file) =>
        file.path.endsWith('style.module.css'),
      )?.contents ?? '';
    expect(css).not.toContain('[data-node="button"]');
  });

  it('anchors nested child overrides to the owning CSS Module root class', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'button',
      name: 'Button',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'button' },
    };
    const card: DocumentFile = {
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'button', type: 'instance', component: 'button' }],
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      styles: { children: { 'card/button': { declarations: { color: 'orange' } } } },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'card', type: 'instance', component: 'card' }],
      },
    };
    const css =
      generateReact({ documents: [host, card, button] }).ui.find(
        (file) => file.path === 'components/Host/style.module.css',
      )?.contents ?? '';
    expect(css).toMatch(
      /\.f_root_[a-z0-9]+ > \[data-node="card"\] > \[data-node="button"\]\[data-component="button"\]/,
    );
    expect(css).toContain('@layer facadeur.nested-instances');
    expect(css).toMatch(/\.f_card_[a-z0-9]+ \{\}/);
    expect(css).toContain('color: orange;');
  });
});
