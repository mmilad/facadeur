/**
 * @vitest-environment jsdom
 */
import { type EventBinding } from '@facadeur/core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { EventsEditorControl } from '../src/ui/controls/data/events/EventsEditorControl';
import { EventBindingsEditorControl } from '../src/ui/controls/data/events/EventBindingsEditorControl';

let root: Root | null = null;
let host: HTMLDivElement | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
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
    await act(async () => render());

    await click('open-add-event');
    await input('event-name-event', 'commit');
    await clickText('Declare fields');
    await input('event-data-commit-field-name-0', 'value');

    expect(defined.at(-1)).toEqual({
      name: 'commit',
      data: { fields: [{ name: 'value', type: { kind: 'type', type: 'string' } }] },
    });
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
