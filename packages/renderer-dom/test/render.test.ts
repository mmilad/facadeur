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
            layout: { position: 'absolute', x: 12, y: 4, width: 80 },
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
    expect((buttonEl as HTMLElement).style.left).toBe('12px');
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
    expect(host.querySelector('[data-id="specimen-section/heading"]')?.textContent).toBe(
      'Specimen',
    );
    expect(host.querySelector('[data-id="specimen-section/btn-primary"]')?.textContent).toBe(
      'Primary',
    );
    expect(host.querySelector('[data-id="specimen-section/card-notes/title"]')?.textContent).toBe(
      'Field notes',
    );
    expect(
      host
        .querySelector('[data-id="specimen-section/card-signin/email/control"]')
        ?.getAttribute('value'),
    ).toBe('ada@atelier.test');
    expect(records.get('specimen-section/card-signin/continue')?.component).toBe('button');
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
});
