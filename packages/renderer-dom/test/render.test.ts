/**
 * @vitest-environment jsdom
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveVariantDocument,
  toFlat,
  validateCatalog,
  type DocumentChange,
  type DocumentFile,
  type DocumentStore,
} from '@facadeur/core';
import { createDomRenderer, renderDocument } from '@facadeur/renderer-dom';

const examplesDir = resolve(process.cwd(), 'examples');

function examples(): DocumentFile[] {
  const raw = readdirSync(examplesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(resolve(examplesDir, name), 'utf8')) as unknown);
  return validateCatalog(raw);
}

describe('renderer', () => {
  it('can preview a named mounted variant without changing the source document', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'variant-preview',
      name: 'Variant preview',
      kind: 'component',
      variants: [
        { name: 'default' },
        { name: 'compact', overrides: { nodes: { root: { text: 'Compact' } } } },
      ],
      root: { id: 'root', type: 'text', tag: 'span', text: 'Base' },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({
      parent: host,
      catalog: [component],
      paintRoot: true,
      resolveMountedDocument: (source) => resolveVariantDocument(source, 'compact'),
    });

    renderer.mount(component);

    expect(host.querySelector('[data-id="root"]')?.textContent).toBe('Compact');
    expect(component.root).toMatchObject({ text: 'Base' });
    renderer.destroy();
  });

  it('expands instances, bindings, and variant data attributes', () => {
    const documents = examples();
    const button = documents.find((document) => document.id === 'button');
    if (!button) throw new Error('missing button');
    const host = document.createElement('div');
    const page: DocumentFile = {
      version: 1,
      id: 'preview',
      name: 'Preview',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'go',
            type: 'instance',
            component: 'button',
            fields: { label: 'Continue' },
            variants: { tone: 'ghost', size: 'sm' },
            layout: {
              position: 'absolute',
              x: 12,
              y: 4,
              width: { mode: 'fixed', size: 80 },
            },
          },
        ],
      },
    };
    const records = renderDocument(page, [page, button], host);
    const buttonEl = host.querySelector('[data-id="go"]');
    expect(buttonEl).toBeInstanceOf(HTMLButtonElement);
    expect(buttonEl?.textContent).toBe('Continue');
    expect(buttonEl?.getAttribute('data-variant-tone')).toBe('ghost');
    expect(buttonEl?.getAttribute('data-variant-size')).toBe('sm');
    expect(buttonEl?.getAttribute('data-node')).toBe('go');
    expect((buttonEl as HTMLElement).style.left).toBe('');
    expect(records.get('go')?.text).toBe('Continue');
    expect(records.get('go')?.fields).toMatchObject({ label: 'Continue' });
    expect(records.get('go/label')).toBeUndefined();
    const hostEmpty = document.createElement('div');
    renderDocument(
      {
        version: 1,
        id: 'empty-doc',
        name: 'Empty',
        kind: 'atom',
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'box', type: 'frame' }],
        },
      },
      [],
      hostEmpty,
      { paintRoot: true },
    );
    expect(hostEmpty.querySelector('[data-id="root"]')?.getAttribute('data-empty')).toBeNull();
    expect(hostEmpty.querySelector('[data-id="root/box"]')?.getAttribute('data-empty')).toBe(
      'true',
    );

    const nativeControls = document.createElement('div');
    renderDocument(
      {
        version: 1,
        id: 'native-controls',
        name: 'Native controls',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [
            { id: 'input', type: 'frame', tag: 'input' },
            { id: 'select', type: 'frame', tag: 'select' },
            { id: 'textarea', type: 'frame', tag: 'textarea' },
          ],
        },
      },
      [],
      nativeControls,
      { paintRoot: true },
    );
    for (const id of ['input', 'select', 'textarea']) {
      expect(
        nativeControls.querySelector(`[data-id="root/${id}"]`)?.getAttribute('data-empty'),
      ).toBeNull();
    }

    const fixedEmpty = document.createElement('div');
    renderDocument(
      {
        version: 1,
        id: 'fixed-empty',
        name: 'Fixed empty',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [
            {
              id: 'thumb',
              type: 'frame',
              layout: {
                width: { mode: 'fixed', size: 16 },
                height: { mode: 'fixed', size: 16 },
              },
            },
          ],
        },
      },
      [],
      fixedEmpty,
      { paintRoot: true },
    );
    expect(fixedEmpty.querySelector('[data-id="root/thumb"]')?.getAttribute('data-empty')).toBe(
      null,
    );
  });

  it('paints the specimen page with nested instance ids', () => {
    const documents = examples();
    const page = documents.find((document) => document.id === 'specimen');
    if (!page) throw new Error('missing page');
    const host = document.createElement('div');
    const records = renderDocument(page, documents, host);
    expect(host.querySelector('[data-id="specimen-section/intro/heading"]')?.textContent).toBe(
      'Specimen',
    );
    expect(
      host.querySelector('[data-id="specimen-section/buttons/button-row/btn-primary"]')
        ?.textContent,
    ).toBe('Primary');
    expect(
      host.querySelector('[data-id="specimen-section/cards/card-row/card-notes/title"]')
        ?.textContent,
    ).toBe('Field notes');
    expect(
      host
        .querySelector('[data-id="specimen-section/cards/card-row/card-signin/email/control"]')
        ?.getAttribute('value'),
    ).toBe('ada@atelier.test');
    expect(records.get('specimen-section/cards/card-row/card-signin/continue')?.component).toBe(
      'button',
    );
    expect(host.querySelector('[data-id="specimen-section"]')?.getAttribute('style')).toBeNull();
  });

  it('skips event-handler attributes and shows an unknown component', () => {
    const page: DocumentFile = {
      version: 1,
      id: 'loose',
      name: 'Loose',
      kind: 'atom',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'label',
            type: 'text',
            tag: 'span',
            text: 'Hi',
            attributes: { class: 'label', onclick: 'alert(1)' },
          },
          { id: 'missing', type: 'instance', component: 'nope' },
        ],
      },
    };
    const host = document.createElement('div');
    renderDocument(page, [page], host);
    const label = host.querySelector('[data-id="label"]');
    expect(label?.getAttribute('onclick')).toBeNull();
    expect(label?.getAttribute('class')).toBe('label');
    expect(host.querySelector('[data-id="missing"]')?.textContent).toBe('Unknown component: nope');
  });

  it('builds nodes in the document that hosts the parent', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const frameDocument = iframe.contentDocument;
    if (!frameDocument?.body) throw new Error('iframe has no document');
    const documents = examples();
    const page = documents.find((entry) => entry.id === 'specimen');
    if (!page) throw new Error('missing page');
    renderDocument(page, documents, frameDocument.body);
    const heading = frameDocument.querySelector('[data-id="specimen-section/intro/heading"]');
    expect(heading?.ownerDocument).toBe(frameDocument);
    expect(heading?.textContent).toBe('Specimen');
    expect(document.body.contains(heading)).toBe(false);
    iframe.remove();
  });

  it('patches a node inside an iframe instead of appending a second copy', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const body = iframe.contentDocument?.body;
    if (!body) throw new Error('iframe has no document');
    const before: DocumentFile = {
      version: 1,
      id: 'sheet',
      name: 'Sheet',
      kind: 'section',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'title', type: 'text', tag: 'h1', text: 'Before' }],
      },
    };
    const after: DocumentFile = {
      ...before,
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'title', type: 'text', tag: 'h1', text: 'After' }],
      },
    };
    renderDocument(before, [before], body);
    renderDocument(after, [after], body);
    expect(body.querySelectorAll('[data-id="title"]')).toHaveLength(1);
    expect(body.querySelector('[data-id="title"]')?.textContent).toBe('After');
    iframe.remove();
  });

  it('paints an atom root only when paintRoot is set', () => {
    const documents = examples();
    const button = documents.find((document) => document.id === 'button');
    if (!button) throw new Error('missing button');
    const hidden = document.createElement('div');
    renderDocument(button, documents, hidden);
    expect(hidden.querySelector('[data-id="root"]')).toBeNull();

    const shown = document.createElement('div');
    renderDocument(button, documents, shown, { paintRoot: true });
    const root = shown.querySelector('[data-id="root"]');
    expect(root?.tagName).toBe('BUTTON');
    expect(root?.textContent).toBe('Button');
    expect(root?.getAttribute('data-component')).toBe('button');
    expect(root?.getAttribute('data-variant-tone')).toBe('primary');
    expect(root?.getAttribute('data-variant-size')).toBe('md');
  });

  it('repeats children from an object array and evaluates display conditions', () => {
    const form: DocumentFile = {
      version: 1,
      id: 'data-form',
      name: 'Data form',
      kind: 'component',
      fields: [
        {
          name: 'fields',
          type: 'array',
          default: [
            { id: 'email', kind: 'input', label: 'Email' },
            { id: 'message', kind: 'textarea', label: 'Message' },
          ],
          items: {
            type: 'object',
            fields: [
              { name: 'id', type: 'text', required: true },
              { name: 'kind', type: 'enum', options: ['input', 'textarea'], required: true },
              { name: 'label', type: 'text', required: true },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'fields', as: 'field', key: 'id' },
        children: [
          {
            id: 'input',
            type: 'instance',
            component: 'data-row',
            fieldBindings: { label: 'field.label' },
            displayOn: { path: 'field.kind', equals: 'input' },
          },
          {
            id: 'textarea',
            type: 'instance',
            component: 'data-row',
            fieldBindings: { label: 'field.label' },
            displayOn: { path: 'field.kind', equals: 'textarea' },
          },
        ],
      },
    };
    const row: DocumentFile = {
      version: 1,
      id: 'data-row',
      name: 'Data row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'text',
        tag: 'span',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    expect(() => validateCatalog([form, row])).not.toThrow();
    const host = document.createElement('div');
    const records = renderDocument(form, [form, row], host, { paintRoot: true });
    expect(host.querySelectorAll('[data-node="input"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-node="textarea"]')).toHaveLength(1);
    expect(host.querySelector('[data-id="root/email/input"]')?.textContent).toBe('Email');
    expect(host.querySelector('[data-id="root/message/textarea"]')?.textContent).toBe('Message');
    expect(records.has('root/email/input')).toBe(true);
    expect(records.has('root/email/textarea')).toBe(false);
  });

  it('repaints component instances inside repeated data rows', () => {
    const rowBefore: DocumentFile = {
      version: 1,
      id: 'repaint-row',
      name: 'Repaint row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'text',
        tag: 'span',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    const rowAfter: DocumentFile = {
      ...rowBefore,
      root: {
        id: 'root',
        type: 'text',
        tag: 'span',
        text: 'After',
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'repaint-host',
      name: 'Repaint host',
      kind: 'component',
      fields: [
        {
          name: 'items',
          type: 'array',
          default: [{ id: 'billing/email', label: 'Before' }],
          items: {
            type: 'object',
            fields: [
              { name: 'id', type: 'text', required: true },
              { name: 'label', type: 'text', required: true },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'items', as: 'item', key: 'id' },
        children: [
          {
            id: 'row',
            type: 'instance',
            component: 'repaint-row',
            fieldBindings: { label: 'item.label' },
          },
        ],
      },
    };
    expect(() => validateCatalog([host, rowBefore])).not.toThrow();

    const parent = document.createElement('div');
    const renderer = createDomRenderer({
      parent,
      catalog: [host, rowBefore],
      paintRoot: true,
    });
    renderer.mount(host);
    expect(parent.querySelector('[data-id="root/billing%2Femail/row"]')?.textContent).toBe(
      'Before',
    );

    let notify: ((change: DocumentChange) => void) | undefined;
    const store: DocumentStore = {
      getDocument: () => toFlat(rowAfter),
      getNode: () => undefined,
      execute: () => undefined,
      subscribe: (listener) => {
        notify = listener;
        return () => undefined;
      },
      undo: () => undefined,
      redo: () => undefined,
      canUndo: () => false,
      canRedo: () => false,
    };
    renderer.connect(store);
    notify?.({ reason: 'undo' });

    expect(parent.querySelectorAll('[data-id="root/billing%2Femail/row"]')).toHaveLength(1);
    expect(parent.querySelector('[data-id="root/billing%2Femail/row"]')?.textContent).toBe('After');
    renderer.destroy();
  });

  it('activates named component variants in DOM instances', () => {
    const card: DocumentFile = {
      version: 1,
      id: 'variant-card',
      name: 'Variant card',
      kind: 'component',
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            nodes: { lede: { text: 'Compact' } },
            removed: ['body'],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'article',
        children: [
          { id: 'lede', type: 'text', text: 'Default' },
          { id: 'body', type: 'text', text: 'Body' },
        ],
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'variant-host',
      name: 'Variant host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'card',
            type: 'instance',
            component: 'variant-card',
            variants: { variant: 'compact' },
          },
        ],
      },
    };
    expect(() => validateCatalog([host, card])).not.toThrow();
    const element = document.createElement('div');
    renderDocument(host, [host, card], element, { paintRoot: true });
    const cardElement = element.querySelector('[data-component="variant-card"]');
    expect(cardElement?.tagName).toBe('ARTICLE');
    expect(cardElement?.getAttribute('data-variant')).toBe('compact');
    expect(cardElement?.textContent).toBe('Compact');
    expect(cardElement?.querySelector('[data-node="body"]')).toBeNull();
  });

  it('renders the data-driven media example with mutually exclusive branches', () => {
    const media = examples().find((document) => document.id === 'media');
    if (!media) throw new Error('missing media example');
    const host: DocumentFile = {
      version: 1,
      id: 'media-host',
      name: 'Media host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'image',
            type: 'instance',
            component: 'media',
            fields: { src: '/cover.png', alt: 'Cover', kind: 'image' },
          },
          {
            id: 'video',
            type: 'instance',
            component: 'media',
            fields: { src: '/intro.mp4', kind: 'video' },
          },
        ],
      },
    };
    expect(() => validateCatalog([host, media])).not.toThrow();
    const element = document.createElement('div');
    renderDocument(host, [host, media], element, { paintRoot: true });
    expect(element.querySelector('[data-id="root/image/image"]')?.getAttribute('src')).toBe(
      '/cover.png',
    );
    expect(element.querySelector('[data-id="root/image/video"]')).toBeNull();
    expect(element.querySelector('[data-id="root/video/video"]')?.getAttribute('src')).toBe(
      '/intro.mp4',
    );
    expect(element.querySelector('[data-id="root/video/image"]')).toBeNull();
  });

  it('keeps nested repeat scopes available to descendant rows', () => {
    const nested: DocumentFile = {
      version: 1,
      id: 'nested-repeat-render',
      name: 'Nested repeat render',
      kind: 'component',
      fields: [
        {
          name: 'sections',
          type: 'array',
          default: [{ rows: [{ label: 'One' }, { label: 'Two' }] }],
          items: {
            type: 'object',
            fields: [
              {
                name: 'rows',
                type: 'array',
                items: {
                  type: 'object',
                  fields: [{ name: 'label', type: 'text', required: true }],
                },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'sections', as: 'section' },
        children: [
          {
            id: 'rows',
            type: 'frame',
            repeat: { path: 'section.rows', as: 'row', key: 'label' },
            children: [
              {
                id: 'label',
                type: 'instance',
                component: 'nested-render-row',
                fieldBindings: { label: 'row.label' },
              },
            ],
          },
        ],
      },
    };
    const row: DocumentFile = {
      version: 1,
      id: 'nested-render-row',
      name: 'Nested render row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'label', target: 'text' }] },
    };
    expect(() => validateCatalog([nested, row])).not.toThrow();
    const element = document.createElement('div');
    renderDocument(nested, [nested, row], element, { paintRoot: true });
    expect(element.querySelectorAll('[data-node="label"]')).toHaveLength(2);
    expect(element.textContent).toContain('One');
    expect(element.textContent).toContain('Two');
  });
});
