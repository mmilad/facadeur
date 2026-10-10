/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EventBinding } from '@facadeur/core';
import { EventBindingsEditorControl } from '../../src/ui/controls/data/events/EventBindingsEditorControl';

describe('event bindings editor', () => {
  afterEach(() => cleanup());

  it('selects native triggers and exposes typed payload sources', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EventBindingsEditorControl
        events={[{ name: 'changed', payload: { value: 'number', valid: 'boolean' } }]}
        bindings={[{ event: 'changed', name: 'input' }]}
        onChangeBindings={onChange}
      />,
    );

    expect(
      (document.querySelector('select[name="event-binding-name-0"]') as HTMLSelectElement).value,
    ).toBe('input');
    expect(
      (
        document.querySelector(
          'select[name="event-binding-data-source-0-value"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe('native:currentTarget.valueAsNumber');
    expect(
      (
        document.querySelector(
          'select[name="event-binding-data-source-0-valid"]',
        ) as HTMLSelectElement
      ).value,
    ).toBe('native:currentTarget.checked');

    await user.selectOptions(
      document.querySelector('select[name="event-binding-name-0"]')!,
      'change',
    );
    expect(onChange).toHaveBeenLastCalledWith([{ event: 'changed', name: 'change' }]);
  });

  it('writes canonical data mappings and drops legacy payload when a mapping is edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const legacyBinding: EventBinding = {
      event: 'changed',
      name: 'input',
      payload: { value: 'valueAsNumber' },
    };
    render(
      <EventBindingsEditorControl
        events={[{ name: 'changed', payload: { value: 'number' } }]}
        bindings={[legacyBinding]}
        onChangeBindings={onChange}
      />,
    );

    await user.selectOptions(
      document.querySelector('select[name="event-binding-data-source-0-value"]')!,
      'literal',
    );

    expect(onChange).toHaveBeenLastCalledWith([
      {
        event: 'changed',
        name: 'input',
        data: [{ path: 'value', source: { kind: 'literal', value: 0 } }],
      },
    ]);
  });
});
