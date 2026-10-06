/**
 * @vitest-environment jsdom
 */
import { act, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toFlat, type DocumentFile, type EventBinding } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../src/domain/session.js';
import { ComponentEvents } from '../src/ui/sidebar/properties/content/component/ComponentEvents.js';
import { SchemaUseControl } from '../src/ui/stage/SchemaUseControl.js';
import { EventsEditorControl } from '../src/ui/controls/data/EventsEditorControl.js';
import { EventBindingsEditorControl } from '../src/ui/controls/data/EventBindingsEditorControl.js';
import { SchemaStage } from '../src/ui/stage/SchemaStage.js';
import { createEditorSession } from '../src/domain/session.js';
import { editorStandardDesign } from './fixtures/example-catalog.js';
import * as files from '../src/domain/assets/files.js';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  vi.restoreAllMocks();
});

describe('event contract controls', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  it('creates named event fields through the shared contract selector', async () => {
    const defined: unknown[] = [];
    let events: import('@facadeur/core').EventDefinition[] = [];
    root = createRoot(mount());
    const render = () =>
      root!.render(
        <EventsEditorControl
          events={events}
          onDefineEvent={(event) => {
            defined.push(event);
            events = [event];
            render();
          }}
          onRemoveEvent={() => undefined}
        />,
      );
    await act(async () => {
      render();
    });

    await click('open-add-event');
    await input('event-name-event', 'commit');
    await clickText('Declare fields');
    await input('event-data-commit-field-name-0', 'value');

    expect(defined.at(-1)).toEqual({
      name: 'commit',
      data: { fields: [{ name: 'value', type: { kind: 'type', type: 'string' } }] },
    });
  });

  it.each(['atom', 'component', 'section', 'page'] as const)(
    'creates and persists shared click wiring for a %s, with element selection',
    async (kind) => {
      const save = vi.spyOn(files, 'saveJsonFile').mockResolvedValue({ via: 'download' });
      const editor = createEditorSession({
        documents: [
          {
            version: 1,
            id: 'button',
            name: 'Button',
            kind,
            ...(kind === 'atom' || kind === 'component' ? { variants: [{ name: 'compact' }] } : {}),
            root: {
              id: 'root',
              type: 'frame',
              tag: 'button',
              ...(kind === 'component'
                ? {
                    children: [
                      { id: 'label', type: 'text' as const, tag: 'span', text: 'Continue' },
                    ],
                  }
                : {}),
            },
          },
        ],
        design: editorStandardDesign(),
      });
      editor.openAsset('button', 'root');
      if (kind === 'atom' || kind === 'component') editor.setActiveVariant('compact');
      function EventSurface() {
        const snap = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
        return (
          <>
            <SchemaStage session={editor} snap={snap} onOpenSchemas={() => undefined} />
          </>
        );
      }
      root = createRoot(mount());
      await act(async () => root!.render(<EventSurface />));
      await click('open-add-event');
      expect(host?.querySelector('[name="event-name-event"]')).not.toBeNull();
      await input('event-name-event', 'click');
      await select('event-target-click-new', 'root');
      expect(host?.querySelector('[name="event-binding-event-0"]')).toBeNull();
      expect(host?.querySelector('[name="add-event-binding"]')).toBeNull();
      expect(editor.getSnapshot().documentDirty).toBe(true);
      expect(editor.getSnapshot().document.events).toEqual([{ name: 'click' }]);
      expect(editor.getSnapshot().document.nodes.root).toMatchObject({
        eventBindings: [{ event: 'click', name: 'click' }],
      });
      if (kind === 'component') {
        await select('event-target-click-0', 'label');
        await select('event-binding-name-0', 'input');
        await select('event-binding-name-0', 'click');
        expect(editor.getSnapshot().document.nodes.label).toMatchObject({
          eventBindings: [{ event: 'click', name: 'click' }],
        });
        await click('add-event-target-click');
        await select('event-target-click-new', 'root');
        await input('event-name-click', 'activate');
        expect(editor.getSnapshot().document.events).toEqual([{ name: 'activate' }]);
        expect(editor.getSnapshot().document.nodes.label).toMatchObject({
          eventBindings: [{ event: 'activate', name: 'click' }],
        });
        await input('event-name-activate', 'click');
      }
      await act(async () => {
        expect(await editor.saveOpenDocument()).toBe(true);
      });
      const saved = JSON.parse(save.mock.calls[0]?.[0].text ?? '{}') as DocumentFile;
      expect(saved.events).toEqual([{ name: 'click' }]);
      expect(saved.root).toMatchObject({ eventBindings: [{ event: 'click', name: 'click' }] });
      expect(saved.variants?.[0] ?? {}).not.toHaveProperty('overrides');
      await act(async () => editor.loadDocument(saved));
      expect(editor.getSnapshot().document.events).toEqual([{ name: 'click' }]);
      expect(editor.getSnapshot().document.nodes.root).toMatchObject({
        eventBindings: [{ event: 'click', name: 'click' }],
      });
      await act(async () => root!.unmount());
      root = null;
      editor.destroy();
    },
  );

  it('defines event data and native mappings in the same accordion', async () => {
    const editor = createEditorSession({
      documents: [
        {
          version: 1,
          id: 'input',
          name: 'Input',
          kind: 'atom',
          root: { id: 'root', type: 'frame', tag: 'input' },
        },
      ],
      design: editorStandardDesign(),
    });
    function EventSurface() {
      const snap = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
      return <ComponentEvents session={editor} snap={snap} />;
    }
    root = createRoot(mount());
    await act(async () => root!.render(<EventSurface />));
    await click('open-add-event');
    await input('event-name-event', 'commit');
    await clickText('Declare fields');
    await input('event-data-commit-field-name-0', 'value');
    await select('event-target-commit-new', 'root');
    expect(editor.getSnapshot().document.events).toEqual([
      {
        name: 'commit',
        data: { fields: [{ name: 'value', type: { kind: 'type', type: 'string' } }] },
      },
    ]);
    expect(editor.getSnapshot().document.nodes.root).toMatchObject({
      eventBindings: [
        {
          event: 'commit',
          name: 'change',
          data: [{ path: 'value', source: { kind: 'native', path: 'currentTarget.value' } }],
        },
      ],
    });
    await select('event-binding-name-0', 'input');
    expect(editor.getSnapshot().document.nodes.root).toMatchObject({
      eventBindings: [{ event: 'commit', name: 'input' }],
    });
    await click('remove-event-commit');
    expect(editor.getSnapshot().document.events ?? []).toEqual([]);
    expect(editor.getSnapshot().document.nodes.root).not.toHaveProperty('eventBindings');
    await act(async () => root!.unmount());
    root = null;
    editor.destroy();
  });

  it('edits a direct event type with the schema picker', async () => {
    const defined: unknown[] = [];
    root = createRoot(mount());
    await act(async () =>
      root!.render(
        <EventsEditorControl
          events={[{ name: 'commit' }]}
          onDefineEvent={(event) => defined.push(event)}
          onRemoveEvent={() => undefined}
        />,
      ),
    );
    await clickCard('commit');
    await click('event-data-commit-type');
    await clickText('Text');

    expect(defined).toEqual([
      { name: 'commit', data: { direct: { kind: 'type', type: 'string' } } },
    ]);
  });

  it('keeps component defaults when switching the shared selector to named fields', async () => {
    const commands: unknown[] = [];
    const session = {
      execute: (command: unknown) => commands.push(command),
    } as unknown as EditorSession;
    const snap = {
      document: {
        id: 'component',
        schemaUse: {
          direct: { kind: 'type', type: 'string' },
          defaults: { value: 'existing default' },
        },
      },
      design: { schemaCatalog: { schemas: [] } },
      documentScopeFields: [],
    } as unknown as EditorSnapshot;
    root = createRoot(mount());
    await act(async () =>
      root!.render(
        <SchemaUseControl session={session} snap={snap} onOpenSchemas={() => undefined} />,
      ),
    );
    await clickText('Declare fields');

    expect(commands[0]).toMatchObject({
      type: 'setSchemaUse',
      schemaUse: {
        fields: [{ name: 'value', type: { kind: 'type', type: 'string' } }],
        defaults: { value: 'existing default' },
      },
    });
  });

  it('resolves a referenced event schema and starts a scalar mapping from the native value', async () => {
    let bindings: EventBinding[] = [];
    const commit = (next: EventBinding[]) => (bindings = next);
    const render = async () => {
      await act(async () =>
        root!.render(
          <EventBindingsEditorControl
            bindings={bindings}
            events={[
              {
                name: 'commit',
                data: { direct: { kind: 'schema', schemaId: 'commit-data' } },
              },
            ]}
            schemaCatalog={{
              schemas: [
                {
                  id: 'commit-data',
                  name: 'Commit data',
                  schema: {
                    type: 'object',
                    properties: { value: { type: 'string' } },
                    required: ['value'],
                  },
                },
              ],
            }}
            onChangeBindings={commit}
          />,
        ),
      );
    };
    root = createRoot(mount());
    await render();
    await click('add-event-binding');
    await render();

    expect(bindings).toEqual([
      {
        event: 'commit',
        name: 'change',
        data: [{ path: 'value', source: { kind: 'native', path: 'currentTarget.value' } }],
      },
    ]);
    expect(host?.querySelector('[data-testid="event-data-mapping-0-value"]')).not.toBeNull();
  });

  it('reviews newly required mappings and saves the event contract in one command', async () => {
    const commands: unknown[] = [];
    const session = {
      project: { commandContext: {} },
      executeDocument: (_id: string, command: unknown) => commands.push(command),
      documentStores: () => [],
      setNotice: () => undefined,
    } as unknown as EditorSession;
    const document = toFlat({
      version: 1,
      id: 'editor',
      name: 'Editor',
      kind: 'component',
      events: [
        {
          name: 'commit',
          data: { fields: [{ name: 'value', type: { kind: 'type', type: 'string' } }] },
        },
      ],
      root: {
        id: 'input',
        type: 'text',
        tag: 'input',
        eventBindings: [
          {
            event: 'commit',
            name: 'change',
            data: [{ path: 'value', source: { kind: 'native', path: 'currentTarget.value' } }],
          },
        ],
      },
    } satisfies DocumentFile);
    const snap = {
      document,
      design: { schemaCatalog: { schemas: [] } },
      documentScopeFields: [],
    } as unknown as EditorSnapshot;
    root = createRoot(mount());
    await act(async () => root!.render(<ComponentEvents session={session} snap={snap} />));
    await clickCard('commit');
    await clickText('Add field');
    await input('event-data-commit-field-name-1', 'source');

    expect(host?.querySelector('[aria-label="Review event data bindings"]')).not.toBeNull();
    expect(host?.querySelector<HTMLButtonElement>('[name="save-event-contract"]')?.disabled).toBe(
      true,
    );
    await select('event-binding-data-source-0-source', 'native:currentTarget.value');
    expect(host?.querySelector<HTMLButtonElement>('[name="save-event-contract"]')?.disabled).toBe(
      false,
    );
    await click('save-event-contract');

    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      type: 'defineEvent',
      event: {
        name: 'commit',
        data: {
          fields: [
            { name: 'value', type: { kind: 'type', type: 'string' } },
            { name: 'source', type: { kind: 'type', type: 'string' } },
          ],
        },
      },
      bindings: {
        input: [
          {
            event: 'commit',
            data: [
              { path: 'value', source: { kind: 'native', path: 'currentTarget.value' } },
              { path: 'source', source: { kind: 'native', path: 'currentTarget.value' } },
            ],
          },
        ],
      },
    });
  });
});

function mount() {
  host = document.createElement('div');
  document.body.append(host);
  return host;
}

async function click(name: string) {
  await act(async () => host?.querySelector<HTMLButtonElement>(`[name="${name}"]`)?.click());
}

async function clickText(text: string) {
  await act(async () => {
    [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent === text)
      ?.click();
  });
}

async function clickCard(title: string) {
  await act(async () => {
    const button = [
      ...document.querySelectorAll<HTMLButtonElement>('.eu-section__header > button'),
    ].find((candidate) => candidate.textContent?.replace(/^[›⌄]\s*/, '') === title);
    if (!button) throw new Error(`Missing event card ${title}`);
    button.click();
  });
}

async function input(name: string, value: string) {
  await act(async () => {
    const input = host?.querySelector<HTMLInputElement>(`[name="${name}"]`);
    if (!input) throw new Error(`Missing input ${name}`);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.focus();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  });
}

async function select(name: string, value: string) {
  await act(async () => {
    const select = host?.querySelector<HTMLSelectElement>(`[name="${name}"]`);
    if (!select) throw new Error(`Missing select ${name}`);
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
