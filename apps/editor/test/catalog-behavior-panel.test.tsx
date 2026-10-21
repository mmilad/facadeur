/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentBehavior, NodeDefinition } from '@facadeur/domain';
import type { EditorEvent } from '../src/domain/sidebar/events';
import { EditorEventType } from '../src/domain/sidebar/events';
import { remapStateReferences } from '../src/app-service/remap-state-references';
import { CatalogBehaviorPanel } from '../src/ui/stage/CatalogBehaviorPanel';

afterEach(cleanup);

const definition: NodeDefinition = {
  uuid: 'definition-1',
  name: 'Toggle',
  kind: 'component',
  schema: {
    kind: 'inline',
    schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  root: {
    uuid: 'root-1',
    name: 'Root',
    dom: {
      tagName: 'div',
      children: [{ uuid: 'button-1', name: 'Toggle button', dom: { tagName: 'button' } }],
    },
  },
  behavior: { state: { open: false, count: 0 }, transitions: [] },
};

function renderControlledPanel(initial: NodeDefinition = definition) {
  let current = initial;
  const onEvent = vi.fn((event: EditorEvent) => {
    if (event.type === EditorEventType.DefinitionBehaviorSet) {
      current = { ...current, behavior: event.data.behavior };
      view.rerender(<CatalogBehaviorPanel definition={current} onEvent={onEvent} />);
    }
  });
  const view = render(<CatalogBehaviorPanel definition={current} onEvent={onEvent} />);
  return { onEvent };
}

describe('CatalogBehaviorPanel transitions', () => {
  it('authors object-list state with a visible stable key and generated initial item IDs', () => {
    const { onEvent } = renderControlledPanel();
    fireEvent.change(screen.getByRole('combobox', { name: 'New state type' }), {
      target: { value: 'object-list' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'New state name' }), {
      target: { value: 'items' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add state' }));

    let event = onEvent.mock.calls.at(-1)?.[0] as Extract<
      EditorEvent,
      { type: EditorEventType.DefinitionBehaviorSet }
    >;
    let behavior = event.data.behavior as ComponentBehavior;
    expect(behavior.state?.items).toEqual([]);
    expect(behavior.stateArrayKeyPaths?.items).toBe('id');
    expect(behavior.stateSchema?.items?.items).toMatchObject({
      type: 'object',
      required: ['id'],
    });

    const stateItem = screen.getByRole('heading', { name: 'items' }).closest('li')!;
    expect(
      within(stateItem).getByRole('combobox', { name: 'Stable key field for items' }),
    ).toBeTruthy();
    fireEvent.click(within(stateItem).getByRole('button', { name: 'Add Item item' }));

    event = onEvent.mock.calls.at(-1)?.[0] as Extract<
      EditorEvent,
      { type: EditorEventType.DefinitionBehaviorSet }
    >;
    behavior = event.data.behavior as ComponentBehavior;
    const items = behavior.state?.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(typeof items[0]?.id).toBe('string');
    expect(items[0]?.id).toBeTruthy();
    expect(items[0]?.label).toBe('');
  });

  it('authors append and remove actions against the active object-list repeater', () => {
    const repeaterUuid = 'list-1';
    const addButtonUuid = 'button-1';
    const initial: NodeDefinition = {
      ...definition,
      root: {
        ...definition.root,
        dom: {
          ...definition.root.dom,
          children: [
            { uuid: addButtonUuid, dom: { tagName: 'button' } },
            {
              uuid: repeaterUuid,
              config: {
                composition: { kind: 'repeater', source: { kind: 'state', name: 'items' } },
              },
              dom: {
                tagName: 'ul',
                children: [{ uuid: 'row-1', dom: { tagName: 'li' } }],
              },
            },
          ],
        },
      },
      behavior: {
        state: { items: [{ id: 'first', label: 'First' }] },
        stateSchema: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, label: { type: 'string' } },
            },
          },
        },
        stateArrayKeyPaths: { items: 'id' },
        transitions: [{ nodeUuid: addButtonUuid, event: 'click', actions: [] }],
      },
    };
    const { onEvent } = renderControlledPanel(initial);
    fireEvent.click(screen.getByRole('button', { name: 'Add state action' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Action type' }), {
      target: { value: 'append-array-item' },
    });

    let event = onEvent.mock.calls.at(-1)?.[0] as Extract<
      EditorEvent,
      { type: EditorEventType.DefinitionBehaviorSet }
    >;
    let action = event.data.behavior.transitions[0]?.actions[0];
    expect(action).toMatchObject({ kind: 'append-array-item', name: 'items', repeaterUuid });

    fireEvent.change(screen.getByRole('combobox', { name: 'Action type' }), {
      target: { value: 'remove-array-item' },
    });
    event = onEvent.mock.calls.at(-1)?.[0] as Extract<
      EditorEvent,
      { type: EditorEventType.DefinitionBehaviorSet }
    >;
    action = event.data.behavior.transitions[0]?.actions[0];
    expect(action).toMatchObject({ kind: 'remove-array-item', name: 'items', repeaterUuid });
  });

  it('only offers preview events and keeps the next transition ready after adding one', () => {
    const { onEvent } = renderControlledPanel();
    const eventInput = screen.getByRole('combobox', { name: 'Transition event name' });
    const eventNames = Array.from((eventInput as HTMLSelectElement).options).map(
      (option) => option.value,
    );

    expect(eventNames).toContain('dragover');
    expect(eventNames).toContain('pointerenter');
    expect(eventNames).not.toContain('made-up-event');
    fireEvent.change(eventInput, { target: { value: 'dragover' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add transition' }));
    expect(screen.getByRole('heading', { name: /emits dragover/i })).toBeTruthy();
    expect(
      (screen.getByRole('combobox', { name: 'Transition event name' }) as HTMLSelectElement).value,
    ).toBe('click');
    expect(onEvent).toHaveBeenCalled();
  });

  it('authors an element event with a data-only state action and operation value', () => {
    const { onEvent } = renderControlledPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Add transition' }));
    const transition = screen.getByRole('heading', { name: /emits click/i }).closest('li')!;
    fireEvent.click(within(transition).getByRole('button', { name: 'Add state action' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Behavior value type' }), {
      target: { value: 'operation' },
    });

    const event = onEvent.mock.calls.at(-1)?.[0] as {
      data: { behavior: { transitions: unknown[] } };
    };
    expect(event.data.behavior.transitions).toEqual([
      {
        nodeUuid: 'root-1',
        event: 'click',
        actions: [
          {
            kind: 'set-state',
            name: 'open',
            value: {
              kind: 'operation',
              operator: 'toggle',
              values: [{ kind: 'state', name: 'open' }],
            },
          },
        ],
      },
    ]);
    expect(JSON.stringify(event)).not.toContain('function ');
  });

  it('authors callback actions with literal arguments', () => {
    const { onEvent } = renderControlledPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Add transition' }));
    const transition = screen.getByRole('heading', { name: /emits click/i }).closest('li')!;
    fireEvent.click(within(transition).getByRole('button', { name: 'Add callback' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Callback name' }), {
      target: { value: 'change' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add callback argument' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Literal type' }), {
      target: { value: 'string' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Literal text' }), {
      target: { value: 'opened' },
    });

    const event = onEvent.mock.calls.at(-1)?.[0] as {
      data: { behavior: { transitions: Array<{ actions: unknown[] }> } };
    };
    expect(event.data.behavior.transitions[0]?.actions).toEqual([
      { kind: 'emit', name: 'change', args: [{ kind: 'literal', value: 'opened' }] },
    ]);
  });

  it('renames state references in transitions when a state is renamed', () => {
    const withTransition = {
      ...definition,
      root: {
        ...definition.root,
        dom: {
          ...definition.root.dom,
          children: [
            ...(definition.root.dom.children ?? []),
            {
              uuid: 'repeater-1',
              config: {
                composition: {
                  kind: 'repeater' as const,
                  source: { kind: 'state' as const, name: 'options' },
                  filter: { kind: 'contains' as const, itemPath: 'label', queryState: 'query' },
                },
              },
              dom: { tagName: 'ul' },
            },
          ],
        },
      },
      behavior: {
        ...definition.behavior!,
        state: { ...definition.behavior!.state, query: '' },
        stateSchema: { query: { type: 'string' } },
        transitions: [
          {
            nodeUuid: 'button-1',
            event: 'click',
            actions: [
              {
                kind: 'set-state' as const,
                name: 'open',
                value: { kind: 'state' as const, name: 'query' },
              },
            ],
          },
        ],
      },
    };
    const { onEvent: captureEvent } = renderControlledPanel(withTransition);

    fireEvent.change(screen.getByRole('textbox', { name: 'State name query' }), {
      target: { value: 'search' },
    });

    const event = captureEvent.mock.calls.at(-1)?.[0] as Extract<
      EditorEvent,
      { type: EditorEventType.DefinitionBehaviorSet }
    >;
    const behavior = event.data.behavior as ComponentBehavior;
    expect(behavior.state).toEqual({ open: false, count: 0, search: '' });
    const remappedRoot = remapStateReferences(withTransition.root, new Map([['query', 'search']]));
    const repeater = remappedRoot.dom.children?.find((node) => node.uuid === 'repeater-1');
    expect(repeater?.config?.composition).toMatchObject({
      kind: 'repeater',
      filter: { kind: 'contains', itemPath: 'label', queryState: 'search' },
    });
    expect(behavior.transitions[0]?.actions).toEqual([
      { kind: 'set-state', name: 'open', value: { kind: 'state', name: 'search' } },
    ]);
  });

  it('disables state deletion while a class condition or transition refers to it', () => {
    const referenced = {
      ...definition,
      root: {
        ...definition.root,
        dom: {
          ...definition.root.dom,
          children: [
            ...(definition.root.dom.children ?? []),
            {
              uuid: 'filter-repeater',
              config: {
                composition: {
                  kind: 'repeater' as const,
                  source: { kind: 'state' as const, name: 'options' },
                  filter: { kind: 'contains' as const, itemPath: 'label', queryState: 'query' },
                },
              },
              dom: { tagName: 'ul' },
            },
          ],
        },
        classes: [
          {
            name: 'is-open',
            condition: {
              kind: 'condition' as const,
              left: { kind: 'reference' as const, reference: '{state:open}' },
              operator: 'equals' as const,
              right: { kind: 'literal' as const, value: true },
            },
          },
        ],
      },
      behavior: {
        ...definition.behavior!,
        state: { ...definition.behavior!.state, query: '' },
        stateSchema: { query: { type: 'string' } },
        transitions: [
          {
            nodeUuid: 'button-1',
            event: 'click',
            actions: [{ kind: 'increment' as const, name: 'count', amount: 1 }],
          },
        ],
      },
    };
    renderControlledPanel(referenced);

    const openState = screen.getByRole('heading', { name: 'open' }).closest('li')!;
    expect(
      (within(openState).getByRole('button', { name: 'Remove state' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      within(openState).getByText(/Repeater, class condition, or transition references/i),
    ).toBeTruthy();
    const queryState = screen.getByRole('heading', { name: 'query' }).closest('li')!;
    expect(
      (within(queryState).getByRole('button', { name: 'Remove state' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
