/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FieldBindingsEditorControl } from '../../src/ui/controls/instance/FieldBindingsEditorControl';

describe('instance field bindings editor', () => {
  afterEach(() => cleanup());

  it('maps exposed component fields to paths in the current scope', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FieldBindingsEditorControl
        fields={[
          { name: 'label', type: 'text' },
          { name: 'disabled', type: 'boolean' },
        ]}
        dataFields={[
          {
            name: 'item',
            type: 'object',
            items: { type: 'object', fields: [{ name: 'label', type: 'text' }] },
          },
        ]}
        bindings={{}}
        onChange={onChange}
      />,
    );

    await user.selectOptions(
      document.querySelector('select[name="field-binding-label"]')!,
      'item.label',
    );
    expect(onChange).toHaveBeenCalledWith({ label: 'item.label' });
  });

  it('clears the last binding when the default option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FieldBindingsEditorControl
        fields={[{ name: 'label', type: 'text' }]}
        dataFields={[{ name: 'title', type: 'text' }]}
        bindings={{ label: 'title' }}
        onChange={onChange}
      />,
    );

    await user.selectOptions(document.querySelector('select[name="field-binding-label"]')!, '');
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
