/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { EditorSession, EditorSnapshot } from '../src/domain/session';
import type { LibrarySchema } from '../src/domain/schema/schema-library';
import { schemaRefUri } from '../src/domain/schema/schema-library';
import { SchemaLibraryStage } from '../src/ui/stage/SchemaLibraryStage';

let root: Root | null = null;

describe('schema composition controls', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('adds and removes allOf and oneOf schema references in the design document', async () => {
    let schemas: LibrarySchema[] = [
      { id: 'combined', name: 'Combined', schema: { type: 'object', properties: {} } },
      { id: 'base', name: 'Base', schema: { type: 'object', properties: {} } },
      { id: 'alternate', name: 'Alternate', schema: { type: 'object', properties: {} } },
    ];
    const session = sessionFor(
      () => schemas,
      (next) => (schemas = next),
    );
    host = mount(session);
    root = createRoot(host);
    await render(root, session);

    await chooseSchema(host, 'allOf', 'base');
    await chooseSchema(host, 'allOf', 'alternate');
    await chooseSchema(host, 'oneOf', 'base');

    const allOfRows = host.querySelectorAll<HTMLSelectElement>('select[name^="schema-allOf-"]');
    expect(allOfRows).toHaveLength(2);
    expect(allOfRows[0]?.value).toBe('base');
    expect(allOfRows[1]?.value).toBe('alternate');
    await act(async () => {
      host!.querySelector<HTMLButtonElement>('[aria-label="Remove Base from Extend by"]')!.click();
    });

    expect(schemas[0]?.schema.allOf).toEqual([{ $ref: schemaRefUri('alternate') }]);
    expect(schemas[0]?.schema.oneOf).toEqual([{ $ref: schemaRefUri('base') }]);
    expect(host.textContent).not.toContain('does not exist');
  });

  it('keeps inline oneOf contracts editable alongside references', async () => {
    let schemas: LibrarySchema[] = [
      {
        id: 'media',
        name: 'Media',
        schema: {
          oneOf: [
            { title: 'Image payload', type: 'object', properties: { src: { type: 'string' } } },
            { title: 'Video payload', type: 'object', properties: { url: { type: 'string' } } },
          ],
        },
      },
      { id: 'image', name: 'Image', schema: { type: 'object', properties: {} } },
    ];
    const session = sessionFor(
      () => schemas,
      (next) => (schemas = next),
    );
    host = mount(session);
    root = createRoot(host);
    await render(root, session);

    expect(host.querySelector<HTMLSelectElement>('select[name="schema-kind"]')?.value).toBe(
      'oneOf',
    );
    await act(async () =>
      host!.querySelector<HTMLButtonElement>('[name="add-schema-oneOf"]')?.click(),
    );
    await act(async () => {
      const select = host!.querySelector<HTMLSelectElement>('select[name="schema-oneOf-new"]')!;
      select.value = 'image';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(schemas[0]?.schema.oneOf).toContainEqual({
      title: 'Image payload',
      type: 'object',
      properties: { src: { type: 'string' } },
    });
    expect(schemas[0]?.schema.oneOf).toContainEqual({ $ref: schemaRefUri('image') });
  });
});

function sessionFor(read: () => LibrarySchema[], write: (schemas: LibrarySchema[]) => void) {
  let currentSnap = snapshot(read());
  const session = {
    boardDocuments: () => [],
    executeDesign(command: { schemaCatalog: { schemas: LibrarySchema[] } }) {
      write(command.schemaCatalog.schemas);
      currentSnap = snapshot(read());
      act(() =>
        root?.render(<SchemaLibraryStage session={session as EditorSession} snap={currentSnap} />),
      );
    },
    testSnapshot: () => currentSnap,
  } as unknown as EditorSession;
  return session;
}

function snapshot(schemas: LibrarySchema[]) {
  return { design: { schemaCatalog: { schemas } } } as EditorSnapshot;
}

function mount(_session: EditorSession): HTMLDivElement {
  const element = document.createElement('div');
  document.body.append(element);
  return element;
}

async function render(root: Root, session: EditorSession) {
  const currentSnap = (
    session as EditorSession & { testSnapshot: () => EditorSnapshot }
  ).testSnapshot();
  await act(async () => root.render(<SchemaLibraryStage session={session} snap={currentSnap} />));
}

async function chooseSchema(
  host: HTMLDivElement,
  kind: 'allOf' | 'oneOf',
  schemaId: string,
): Promise<void> {
  await act(async () =>
    host.querySelector<HTMLButtonElement>(`[name="add-schema-${kind}"]`)!.click(),
  );
  await act(async () => {
    const select = host.querySelector<HTMLSelectElement>(`select[name="schema-${kind}-new"]`)!;
    select.value = schemaId;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
