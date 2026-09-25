/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@facadeur/store-yjs';
import { createDomRenderer } from '@facadeur/renderer-dom';
import { createStyleEngine, type CompiledRule } from '@facadeur/style-engine';
import { compileDocument } from '@facadeur/style-engine';
import button from '../../../examples/button.json';
import type { DocumentFile } from '@facadeur/core';

function text(rules: readonly CompiledRule[]): string {
  return rules
    .map((rule) => {
      const body = rule.declarations.map(([name, value]) => `${name}: ${value}`).join('; ');
      const block = `${rule.selector} { ${body} }`;
      return rule.minWidth === undefined
        ? block
        : `@media (min-width: ${rule.minWidth}px) { ${block} }`;
    })
    .join('\n');
}

describe('component style block', () => {
  const compiled = text(compileDocument(button as DocumentFile));

  it('emits token references, states, variants, and a real media query', () => {
    expect(compiled).toContain('[data-component="button"]');
    expect(compiled).toContain('background: var(--button-color-bg)');
    expect(compiled).toContain('font-family: var(--type-label--font-family)');
    expect(compiled).toContain('font-size: var(--type-label--font-size)');
    expect(compiled).toContain('[data-component="button"]:hover');
    expect(compiled).toContain('[data-component="button"]:focus-visible');
    expect(compiled).toContain('[data-component="button"]:disabled');
    expect(compiled).toContain('[data-component="button"][data-variant-tone="ghost"]');
    expect(compiled).toContain('[data-component="button"][data-variant-size="sm"]');
    expect(compiled).toContain('@media (min-width: 768px)');
    expect(compiled).not.toContain('min-width: 375px');
    expect(compiled).toContain('display: flex');
    expect(compiled).toContain('flex-direction: row');
    expect(compiled).toContain('width: fit-content');
    expect(compiled).toContain('gap: var(--button-gap)');
    expect(compiled).toContain('padding-inline: var(--button-padding-x)');
  });

  it('emits the frame root on the canvas only when paintRoot is set', () => {
    const painted = text(
      compileDocument(button as DocumentFile, { address: 'canvas', paintRoot: true }),
    );
    expect(painted).toContain('[data-id="root"]');
    expect(painted).toContain('display: flex');
    const hidden = text(compileDocument(button as DocumentFile, { address: 'canvas' }));
    expect(hidden).not.toContain('[data-id="root"]');
  });
});

describe('style engine and renderer', () => {
  it('paints token sets and updates a style rule without replacing the element', () => {
    const engine = createStyleEngine(document);
    engine.setDesign({
      tokens: {
        color: {
          $type: 'color',
          accent: { default: { $value: '#2563eb' } },
        },
        input: {
          color: { $type: 'color', border: { $value: '{color.accent.default}' } },
        },
      },
    });
    const card: DocumentFile = {
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      tokenInterface: {
        reads: ['input.color.border', 'color.accent.default'],
        sets: { 'input.color.border': '{color.accent.default}' },
      },
      styles: {
        declarations: { background: '{color.accent.default}' },
      },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'article',
        children: [{ id: 'title', type: 'text', tag: 'h2', text: 'Hello' }],
      },
    };
    const page: DocumentFile = {
      version: 1,
      id: 'page',
      name: 'Page',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'card', type: 'instance', component: 'card' }],
      },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({
      parent: host,
      catalog: [page, card],
      styles: engine,
    });
    renderer.mount(page);
    const title = host.querySelector('[data-id="card/title"]');
    expect(title).toBeInstanceOf(HTMLElement);
    const sheet = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(sheet).toContain('--input-color-border: var(--color-accent-default)');
    expect(sheet).toContain('background: var(--color-accent-default)');

    const store = createDocumentStore(card);
    renderer.connect(store);
    store.execute({
      type: 'setStyle',
      nodeId: 'title',
      property: 'color',
      value: '{color.accent.default}',
    });
    expect(host.querySelector('[data-id="card/title"]')).toBe(title);
    expect(title?.textContent).toBe('Hello');
    const next = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(next).toContain('color: var(--color-accent-default)');
    engine.destroy();
  });

  it('patches one node and leaves its sibling element in place', () => {
    const page: DocumentFile = {
      version: 1,
      id: 'page',
      name: 'Page',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'a', type: 'text', tag: 'span', text: 'A' },
          { id: 'b', type: 'text', tag: 'span', text: 'B' },
        ],
      },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({ parent: host, catalog: [page] });
    renderer.mount(page);
    const sibling = host.querySelector('[data-id="b"]');
    const store = createDocumentStore(page);
    renderer.connect(store);
    store.execute({ type: 'setProp', nodeId: 'a', prop: 'text', value: 'Changed' });
    expect(host.querySelector('[data-id="a"]')?.textContent).toBe('Changed');
    expect(host.querySelector('[data-id="b"]')).toBe(sibling);
    store.execute({
      type: 'insert',
      parentId: 'root',
      node: { id: 'c', type: 'text', tag: 'span', text: 'C' },
    });
    expect(host.querySelector('[data-id="c"]')?.textContent).toBe('C');
    expect(host.querySelector('[data-id="b"]')).toBe(sibling);
    store.execute({ type: 'remove', nodeId: 'a' });
    expect(host.querySelector('[data-id="a"]')).toBeNull();
    expect(host.querySelector('[data-id="b"]')).toBe(sibling);
  });

  it('updates a nested instance and keeps the frame sibling element', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'button',
      name: 'Button',
      kind: 'atom',
      root: { id: 'root', type: 'text', tag: 'span', text: 'Hello' },
    };
    const page: DocumentFile = {
      version: 1,
      id: 'page',
      name: 'Page',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'row',
            type: 'frame',
            children: [
              { id: 'go', type: 'instance', component: 'button' },
              { id: 'note', type: 'text', tag: 'span', text: 'Note' },
            ],
          },
        ],
      },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({ parent: host, catalog: [page, button] });
    renderer.mount(page);
    const note = host.querySelector('[data-id="row/note"]');
    expect(host.querySelector('[data-id="row/go"]')?.textContent).toBe('Hello');
    const store = createDocumentStore(button);
    renderer.connect(store);
    store.execute({ type: 'setProp', nodeId: 'root', prop: 'text', value: 'Updated' });
    expect(host.querySelector('[data-id="row/go"]')?.textContent).toBe('Updated');
    expect(host.querySelector('[data-id="row/note"]')).toBe(note);
    renderer.destroy();
  });

  it('emits absolute placement only when position is absolute', () => {
    const doc: DocumentFile = {
      version: 1,
      id: 'abs',
      name: 'Absolute',
      kind: 'atom',
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        children: [
          {
            id: 'pin',
            type: 'text',
            tag: 'span',
            text: 'Pin',
            layout: { position: 'absolute', x: 12, y: 4, width: { mode: 'fixed', size: 80 } },
          },
        ],
      },
    };
    const css = text(compileDocument(doc));
    expect(css).toContain('[data-component="abs"] [data-node="pin"]');
    expect(css).toContain('position: absolute');
    expect(css).toContain('left: 12px');
    expect(css).toContain('top: 4px');
    expect(css).toContain('width: 80px');
    const flow = text(
      compileDocument({
        ...doc,
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'pin', type: 'text', tag: 'span', text: 'Pin' }],
        },
      }),
    );
    expect(flow).not.toContain('position: absolute');
  });
});
