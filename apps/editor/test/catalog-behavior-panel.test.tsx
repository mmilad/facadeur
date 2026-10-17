/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentBehavior, NodeDefinition } from '@facadeur/domain';
import type { EditorEvent } from '../src/domain/sidebar/events';
import { EditorEventType } from '../src/domain/sidebar/events';
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
  let view: ReturnType<typeof render>;
  const onEvent = vi.fn((event: EditorEvent) => {
    if (event.type === EditorEventType.DefinitionBehaviorSet) {
      current = { ...current, behavior: event.data.behavior };
      view.rerender(<CatalogBehaviorPanel definition={current} onEvent={onEvent} />);
    }
  });
  view = render(<CatalogBehaviorPanel definition={current} onEvent={onEvent} />);
  return { onEvent };
}

describe('CatalogBehaviorPanel transitions', () => {
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
      behavior: {
        ...definition.behavior!,
        transitions: [
          {
            nodeUuid: 'button-1',
            event: 'click',
            actions: [
              {
                kind: 'set-state' as const,
                name: 'open',
                value: { kind: 'state' as const, name: 'open' },
              },
            ],
          },
        ],
      },
    };
    const { onEvent: captureEvent } = renderControlledPanel(withTransition);

    fireEvent.change(screen.getByRole('textbox', { name: 'State name open' }), {
      target: { value: 'expanded' },
    });

    const event = captureEvent.mock.calls.at(-1)?.[0] as Extract<
      EditorEvent,
      { type: EditorEventType.DefinitionBehaviorSet }
    >;
    const behavior = event.data.behavior as ComponentBehavior;
    expect(behavior.state).toEqual({ expanded: false, count: 0 });
    expect(behavior.transitions[0]?.actions).toEqual([
      { kind: 'set-state', name: 'expanded', value: { kind: 'state', name: 'expanded' } },
    ]);
  });

  it('disables state deletion while a class condition or transition refers to it', () => {
    const referenced = {
      ...definition,
      root: {
        ...definition.root,
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
  });
});
