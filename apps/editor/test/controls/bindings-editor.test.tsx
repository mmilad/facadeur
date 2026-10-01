/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BindingsEditorControl } from '../../src/ui/controls/data/BindingsEditorControl.js';

describe('bindings editor', () => {
  afterEach(() => cleanup());

  it('uses native slots instead of target selects', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BindingsEditorControl
        nodeType="frame"
        tag="input"
        fields={[
          { name: 'value', type: 'text' },
          { name: 'placeholder', type: 'text' },
        ]}
        bindings={[{ field: 'value', target: 'attribute', name: 'value' }]}
        onChangeBindings={onChange}
      />,
    );

    const slotSelect = document.querySelector(
      'select[name="binding-slot-0"]',
    ) as HTMLSelectElement;
    expect(slotSelect.value).toBe('value');
    expect(document.querySelector('select[name="binding-target-0"]')).toBeNull();

    await user.selectOptions(slotSelect, 'placeholder');
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'value', target: 'attribute', name: 'placeholder' },
    ]);
  });

  it('gives a custom attribute a name when the previous slot had none', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BindingsEditorControl
        nodeType="text"
        fields={[{ name: 'label', type: 'text' }]}
        bindings={[{ field: 'label', target: 'text' }]}
        onChangeBindings={onChange}
      />,
    );

    await user.selectOptions(
      document.querySelector('select[name="binding-slot-0"]')!,
      'attribute:custom',
    );
    expect(onChange).toHaveBeenLastCalledWith([
      { field: 'label', target: 'attribute', name: 'name' },
    ]);
  });
});
