import { describe, expect, it } from 'vitest';
import { generateReact } from '../src/index';
import type { DocumentFile } from '@facadeur/core';
import { JSDOM } from 'jsdom';
import { generatedRuntime } from './generated-runtime';

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
    expect(css).toContain('.root :global(.Host__button) {');
    expect(css).toContain('color: var(--color-accent);');
    expect(css).toContain('.root :global(.Host__button):hover');
    expect(css).toContain('.root[data-variant="compact"] :global(.Host__button)');
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
    expect(css).not.toContain('Host__button');
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
        children: [
          { id: 'card', type: 'instance', component: 'card' },
          { id: 'other-card', type: 'instance', component: 'card' },
        ],
      },
    };
    const css =
      generateReact({ documents: [host, card, button] }).ui.find(
        (file) => file.path === 'components/Host/style.module.css',
      )?.contents ?? '';
    expect(css).toContain('.root :global(.Host__card) :global(.Card__button)');
    expect(css).toContain('@layer facadeur.nested-instances');
    expect(css).not.toMatch(/\.[\w-]+\s*\{\s*\}/);
    expect(css).toContain('color: orange;');
    const generated = generateReact({ documents: [host, card, button] });
    const runtime = generatedRuntime(generated.ui);
    const html: string = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(runtime.load('components/Host').Host),
    );
    const dom = new JSDOM(html);
    const selector = '.root .Host__card .Card__button';
    expect(dom.window.document.querySelectorAll(selector)).toHaveLength(1);
    expect(dom.window.document.querySelectorAll('.Host__other-card .Card__button')).toHaveLength(1);
    expect(html).not.toContain('data-node');
    dom.window.close();
  });

  it('styles all repeated Cards separately from Textareas through placement classes', () => {
    const card: DocumentFile = {
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', required: true }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'title', target: 'text' }] },
    };
    const textarea: DocumentFile = {
      version: 1,
      id: 'textarea',
      name: 'Textarea',
      kind: 'component',
      fields: [{ name: 'value', type: 'text', required: true }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'value', target: 'text' }] },
    };
    const list: DocumentFile = {
      version: 1,
      id: 'list',
      name: 'List',
      kind: 'section',
      styles: {
        children: {
          card: { declarations: { color: 'red' } },
          textarea: { declarations: { color: 'blue' } },
        },
      },
      root: {
        id: 'root',
        type: 'repeater',
        children: [
          {
            id: 'choices',
            type: 'switch',
            children: [
              { id: 'card', type: 'instance', component: 'card' },
              { id: 'textarea', type: 'instance', component: 'textarea' },
            ],
          },
        ],
      },
    };
    const generated = generateReact({ documents: [list, card, textarea] });
    const css = generated.ui.find(
      (file) => file.path === 'components/List/style.module.css',
    )!.contents;
    expect(css).toContain('.root:global(.List__card)');
    expect(css).toContain('.root:global(.List__textarea)');
    const runtime = generatedRuntime(generated.ui);
    const html: string = runtime.server.renderToStaticMarkup(
      runtime.react.createElement(runtime.load('components/List').List, {
        className: 'ExternalList',
        items: [
          { type: 'card', props: { title: 'First' } },
          { type: 'textarea', props: { value: 'Middle' } },
          { type: 'card', props: { title: 'Last' } },
        ],
      }),
    );
    const dom = new JSDOM(html);
    expect(dom.window.document.querySelectorAll('.root.List__card')).toHaveLength(2);
    expect(dom.window.document.querySelectorAll('.root.List__textarea')).toHaveLength(1);
    expect(dom.window.document.querySelectorAll('.ExternalList')).toHaveLength(3);
    expect(html).not.toContain('data-node');
    expect(
      generated.ui
        .filter((file) => file.path.endsWith('.tsx'))
        .every((file) => !file.contents.includes('nodeId')),
    ).toBe(true);
    dom.window.close();
  });
});
