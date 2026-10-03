/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventBindingsEditorControl } from '../../src/ui/controls/data/EventBindingsEditorControl';

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
      (document.querySelector('select[name="event-binding-payload-0-value"]') as HTMLSelectElement)
        .value,
    ).toBe('valueAsNumber');
    expect(
      (document.querySelector('select[name="event-binding-payload-0-valid"]') as HTMLSelectElement)
        .value,
    ).toBe('checked');

    await user.selectOptions(
      document.querySelector('select[name="event-binding-name-0"]')!,
      'change',
    );
    expect(onChange).toHaveBeenLastCalledWith([{ event: 'changed', name: 'change' }]);
  });
});
