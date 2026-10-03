/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLibrarySchema,
  getSchemaLibrary,
  resetSchemaLibrary,
  schemaRefUri,
  updateLibrarySchema,
} from '../src/domain/schema/schema-library';
import { SchemaLibraryStage } from '../src/ui/stage/SchemaLibraryStage';

describe('schema composition controls', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => resetSchemaLibrary());
  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('adds and removes allOf and oneOf schema references', async () => {
    const schema = createLibrarySchema('Combined');
    const base = createLibrarySchema('Base');
    const alternate = createLibrarySchema('Alternate');
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root?.render(<SchemaLibraryStage snap={{ document: { id: 'doc' } } as never} />),
    );

    await chooseSchema(host, 'allOf', base.id);
    await chooseSchema(host, 'allOf', alternate.id);
    await chooseSchema(host, 'oneOf', base.id);

    const allOfRows = host.querySelectorAll<HTMLSelectElement>('select[name^="schema-allOf-"]');
    expect(allOfRows).toHaveLength(2);
    expect(allOfRows[0]?.value).toBe(base.id);
    expect(allOfRows[1]?.value).toBe(alternate.id);
    await act(async () => {
      host!
        .querySelector<HTMLButtonElement>(`[aria-label="Remove ${base.name} from Extend by"]`)!
        .click();
    });

    const saved = getSchemaLibrary().schemas.find((entry) => entry.id === schema.id)?.schema;
    expect(saved?.allOf).toEqual([{ $ref: schemaRefUri(alternate.id) }]);
    expect(saved?.oneOf).toEqual([{ $ref: schemaRefUri(base.id) }]);
    expect(host.textContent).not.toContain('does not exist');
  });

  it('keeps inline oneOf contracts editable alongside references', async () => {
    const schema = createLibrarySchema('Media');
    const image = createLibrarySchema('Image');
    updateLibrarySchema(schema.id, {
      oneOf: [
        { title: 'Image payload', type: 'object', properties: { src: { type: 'string' } } },
        { title: 'Video payload', type: 'object', properties: { url: { type: 'string' } } },
      ],
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root?.render(<SchemaLibraryStage snap={{ document: { id: 'doc' } } as never} />),
    );

    expect(host.querySelector<HTMLSelectElement>('select[name="schema-kind"]')?.value).toBe(
      'oneOf',
    );
    await act(async () =>
      host!.querySelector<HTMLButtonElement>('[name="add-schema-oneOf"]')?.click(),
    );
    await act(async () => {
      const select = host!.querySelector<HTMLSelectElement>('select[name="schema-oneOf-new"]')!;
      select.value = image.id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const saved = getSchemaLibrary().schemas.find((entry) => entry.id === schema.id)?.schema;
    expect(saved?.oneOf).toContainEqual({
      title: 'Image payload',
      type: 'object',
      properties: { src: { type: 'string' } },
    });
    expect(saved?.oneOf).toContainEqual({ $ref: schemaRefUri(image.id) });
  });
});

async function chooseSchema(
  host: HTMLDivElement,
  kind: 'allOf' | 'oneOf',
  schemaId: string,
): Promise<void> {
  await act(async () => {
    host.querySelector<HTMLButtonElement>(`[name="add-schema-${kind}"]`)!.click();
  });
  await act(async () => {
    const select = host.querySelector<HTMLSelectElement>(`select[name="schema-${kind}-new"]`)!;
    select.value = schemaId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
