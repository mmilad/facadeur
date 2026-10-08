// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createDomRenderer } from '@facadeur/renderer-dom';
import { createTestDocumentStore } from './controller-store';
import { createStyleEngine } from '@facadeur/style-engine';

const source: DocumentFile = {
  version: 1,
  id: 'lifecycle-component',
  name: 'Lifecycle component',
  kind: 'component',
  fields: [{ name: 'visible', type: 'boolean', default: true }],
  root: {
    id: 'root',
    type: 'frame',
    children: [
      {
        id: 'field',
        type: 'frame',
        displayOn: { path: 'visible', truthy: true },
        children: [{ id: 'control', type: 'frame', tag: 'input' }],
      },
    ],
  },
};

describe('live renderer lifecycle', () => {
  it('keeps a focused input and its unsaved value through layout-only edits', () => {
    const store = createTestDocumentStore(source);
    const host = document.createElement('div');
    document.body.append(host);
    const styles = createStyleEngine(document);
    const renderer = createDomRenderer({
      parent: host,
      catalog: [source],
      styles,
      paintRoot: true,
    });
    renderer.mount(source);
    renderer.connect(store);
    const input = host.querySelector('input')!;
    input.value = 'Unsaved typing';
    input.focus();

    store.execute({
      type: 'setProp',
      nodeId: 'field',
      prop: 'layout',
      value: { direction: 'row' },
    });

    expect(host.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('Unsaved typing');
    expect(
      [...styles.controller.sheet.cssRules].some(
        (rule) =>
          rule.cssText.includes('[data-node="field"]') &&
          rule.cssText.includes('flex-direction: row'),
      ),
    ).toBe(true);
    renderer.destroy();
    styles.destroy();
    store.destroy();
    host.remove();
  });

  it('removes hidden subtree records and restores them on undo', () => {
    const store = createTestDocumentStore(source);
    const host = document.createElement('div');
    const renderer = createDomRenderer({ parent: host, catalog: [source], paintRoot: true });
    renderer.mount(source);
    renderer.connect(store);
    expect(renderer.records.has('root/field/control')).toBe(true);

    store.execute({
      type: 'defineField',
      field: { name: 'visible', type: 'boolean', default: false },
    });

    expect(host.querySelector('input')).toBeNull();
    expect(renderer.records.has('root/field')).toBe(false);
    expect(renderer.records.has('root/field/control')).toBe(false);
    store.undo();
    expect(host.querySelectorAll('input')).toHaveLength(1);
    expect(renderer.records.has('root/field/control')).toBe(true);
    renderer.destroy();
    expect(renderer.records.size).toBe(0);
    store.destroy();
  });
});
