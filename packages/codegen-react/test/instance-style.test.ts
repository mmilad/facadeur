import { describe, expect, it } from 'vitest';
import { renderComponentCss } from '@facadeur/codegen-react';
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
    const css = renderComponentCss([host]);
    expect(css).toContain(
      '[data-component="host"] > [data-node="button"][data-component="control"][data-component="control"]',
    );
    expect(css).toContain('color: var(--color-accent);');
    expect(css).toContain(
      '[data-component="host"] > [data-node="button"][data-component="control"][data-component="control"]:hover',
    );
    expect(css).toContain(
      '[data-component="host"][data-variant="compact"] > [data-node="button"][data-component="control"][data-component="control"]',
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
    expect(renderComponentCss([reset])).not.toContain('[data-node="button"]');
  });
});
