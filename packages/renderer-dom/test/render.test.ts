/**
 * @vitest-environment jsdom
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { renderDocument } from '@facadeur/renderer-dom';

const examplesDir = resolve(process.cwd(), 'examples');

function examples(): DocumentFile[] {
  const raw = readdirSync(examplesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => JSON.parse(readFileSync(resolve(examplesDir, name), 'utf8')) as unknown);
  return validateCatalog(raw);
}

describe('renderer', () => {
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
  });
});
