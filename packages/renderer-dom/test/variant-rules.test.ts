// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { withPreviewData, type DocumentFile } from '@facadeur/core';
import { createDomRenderer, renderDocument } from '../src/render.js';

const child: DocumentFile = {
  version: 1,
  id: 'input',
  name: 'Input',
  kind: 'atom',
  variants: [
    { name: 'error', overrides: { nodes: { root: { text: 'Error' } } } },
    { name: 'compact', overrides: { nodes: { root: { text: 'Compact' } } } },
  ],
  root: { id: 'root', type: 'text', text: 'Default' },
};
const parent: DocumentFile = {
  version: 1,
  id: 'parent',
  name: 'Parent',
  kind: 'component',
  fields: [{ name: 'invalid', type: 'boolean', default: true }],
  root: {
    id: 'root',
    type: 'frame',
    children: [
      {
        id: 'control',
        type: 'instance',
        component: 'input',
        variantRules: [
          { when: { path: 'invalid', truthy: true }, variant: 'error' },
          { when: { path: 'invalid', truthy: true }, variant: 'compact' },
        ],
      },
    ],
  },
};

describe('conditional variants and editor samples', () => {
  it('renders false native boolean attributes as absent and preserves aria values', () => {
    const sample: DocumentFile = {
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'atom',
      fields: [{ name: 'disabled', type: 'boolean' }],
      previewData: { fields: { disabled: false } },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        bindings: [
          { field: 'disabled', target: 'attribute', name: 'disabled' },
          { field: 'disabled', target: 'attribute', name: 'aria-disabled' },
        ],
      },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({
      parent: host,
      catalog: [sample],
      paintRoot: true,
      resolveMountedDocument: (doc) => withPreviewData(doc),
    });
    renderer.mount(sample);
    const input = host.querySelector('input');
    expect(input?.disabled).toBe(false);
    expect(input?.getAttribute('aria-disabled')).toBe('false');
    renderer.mount({ ...sample, previewData: { fields: { disabled: true } } });
    expect(host.querySelector('input')?.disabled).toBe(true);
    renderer.destroy();
  });
  it('uses the first matching rule, then respects an explicit Default selection', () => {
    const host = document.createElement('div');
    renderDocument(parent, [parent, child], host);
    expect(host.textContent).toBe('Error');
    expect(host.querySelector('[data-component="input"]')?.getAttribute('data-variant')).toBe(
      'error',
    );
    const explicit = structuredClone(parent);
    if (explicit.root.type !== 'frame' || explicit.root.children?.[0]?.type !== 'instance')
      throw Error('fixture');
    explicit.root.children[0].variants = { variant: 'default' };
    renderDocument(explicit, [explicit, child], host);
    expect(host.textContent).toBe('Default');
  });
  it('prepares sample values for nested instances without changing the saved contract', () => {
    const sample: DocumentFile = {
      ...child,
      fields: [{ name: 'value', type: 'text', required: true }],
      previewData: {
        fields: { value: 'Base sample' },
        variants: { error: { value: 'Variant sample' } },
      },
      root: { id: 'root', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
      variants: [{ name: 'error' }],
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({
      parent: host,
      catalog: [parent, sample],
      prepareInstanceDocument: (doc, variant) => withPreviewData(doc, variant),
    });
    renderer.mount(parent);
    expect(host.textContent).toBe('Variant sample');
    expect(sample.fields?.[0]?.default).toBeUndefined();
    renderer.destroy();
  });
});
