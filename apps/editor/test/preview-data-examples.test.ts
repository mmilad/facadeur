// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toFlat, validateDocumentFile, withPreviewData, type DocumentFile } from '@facadeur/core';
import { createDomRenderer } from '@facadeur/renderer-dom';
import { migratePreviewData } from '../src/domain/preview-data';

const directory = resolve('examples');
const examples = readdirSync(directory)
  .filter((name) => name.endsWith('.json') && name !== 'schemas.json')
  .map((name) => validateDocumentFile(JSON.parse(readFileSync(resolve(directory, name), 'utf8'))));

function example(id: string): DocumentFile {
  const file = examples.find((item) => item.id === id);
  if (!file) throw new Error(`Missing example ${id}`);
  return file;
}

function renderPreview(file: DocumentFile, variant: string | null = null): HTMLElement {
  const host = document.createElement('div');
  const renderer = createDomRenderer({
    parent: host,
    catalog: [file, ...examples.filter((example) => example.id !== file.id)],
    paintRoot: true,
    resolveMountedDocument: (doc) =>
      withPreviewData(migratePreviewData(doc), doc.id === file.id ? variant : null),
    prepareInstanceDocument: (doc, variant) => withPreviewData(migratePreviewData(doc), variant),
  });
  try {
    renderer.mount(file);
    return host.cloneNode(true) as HTMLElement;
  } finally {
    renderer.destroy();
  }
}

describe('example preview datasets', () => {
  it.each(['card', 'sign-in'])('renders %s content standalone and nested', (id) => {
    const file = example(id);
    const before = structuredClone(file);
    const standalone = renderPreview(file);
    const nested = renderPreview({
      version: 1,
      id: 'example-parent',
      name: 'Example parent',
      kind: 'page',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'sample', type: 'instance', component: id }],
      },
    });
    for (const name of ['eyebrow', 'title', 'body']) {
      const value = file.previewData?.fields?.[name];
      expect(value).toEqual(expect.any(String));
      expect(standalone.textContent).toContain(value);
      expect(nested.textContent).toContain(value);
    }
    expect(file).toEqual(before);
    expect(file.fields?.every((field) => field.default === undefined)).toBe(true);
  });

  it('renders Specimen with SignIn samples and keeps explicit Card instance content', () => {
    const specimen = example('specimen');
    const section = toFlat(specimen).nodes['specimen-section'];
    const email = toFlat(example('specimen-section')).nodes['input-email'];
    if (section?.type !== 'instance' || email?.type !== 'instance') {
      throw new Error('Missing Specimen section or email instance');
    }
    const expectedEmail =
      section.childFields?.['input-email']?.value ??
      email.fields?.value ??
      example('input').previewData?.fields?.value;
    expect(expectedEmail).toEqual(expect.any(String));
    const host = renderPreview(specimen);
    expect(host.textContent).toContain('Field notes');
    expect(host.textContent).not.toContain(example('card').previewData?.fields?.title);
    for (const name of ['eyebrow', 'title', 'body']) {
      expect(host.textContent).toContain(example('sign-in').previewData?.fields?.[name]);
    }
    expect(host.querySelector<HTMLInputElement>('[data-node="input-email"] input')?.value).toBe(
      expectedEmail,
    );
    expect(host.textContent).toContain('Continue');
  });

  it('inherits base samples in named previews and overrides only the supplied fields', () => {
    const card = structuredClone(example('card'));
    card.variants = [{ name: 'compact' }, { name: 'inherited' }];
    card.previewData!.variants = { compact: { title: 'Compact card' } };
    const compact = renderPreview(card, 'compact');
    expect(compact.textContent).toContain('Compact card');
    expect(compact.textContent).not.toContain(card.previewData?.fields?.title);
    for (const name of ['eyebrow', 'body']) {
      expect(compact.textContent).toContain(card.previewData?.fields?.[name]);
    }
    const inherited = renderPreview(card, 'inherited');
    expect(inherited.textContent).toContain(card.previewData?.fields?.title);
    expect(card.previewData?.variants).toEqual({ compact: { title: 'Compact card' } });
  });

  it('honors sparse instance overrides, including intentional empty content', () => {
    const host = renderPreview({
      version: 1,
      id: 'instance-overrides',
      name: 'Instance overrides',
      kind: 'page',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'card',
            type: 'instance',
            component: 'card',
            fields: { title: '', body: 'Instance body' },
          },
        ],
      },
    });
    expect(host.querySelector('h2')?.textContent).toBe('');
    expect(host.textContent).toContain('Instance body');
    expect(host.textContent).toContain(example('card').previewData?.fields?.eyebrow);
    expect(host.textContent).not.toContain(example('card').previewData?.fields?.body);
  });

  it.each(examples.filter((file) => file.fields?.length))(
    'provides usable standalone content for $id without populating named preview layers',
    (file) => {
      const host = renderPreview(file);
      expect(
        Boolean(host.textContent?.trim()) ||
          Boolean(host.querySelector('input, textarea, img[src]')),
      ).toBe(true);
      expect(file.previewData?.variants).toBeUndefined();
    },
  );

  it('uses a self-contained media sample and preserves runtime enum defaults', () => {
    const media = example('media');
    expect(renderPreview(media).querySelector('img')?.getAttribute('src')).toMatch(/^data:image/);
    expect(media.fields?.find((field) => field.name === 'kind')?.default).toBe('image');
  });
});
