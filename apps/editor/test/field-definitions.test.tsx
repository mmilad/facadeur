/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FieldsEditorControl } from '../src/ui/controls/data/FieldsEditorControl.js';

describe('field definition editor', () => {
  afterEach(() => cleanup());

  it('edits the required flag without changing the rest of the field contract', async () => {
    const user = userEvent.setup();
    const onDefineField = vi.fn();
    render(
      <FieldsEditorControl
        fields={[{ name: 'title', type: 'text', default: 'Title' }]}
        onDefineField={onDefineField}
        onRemoveField={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Title' }));
    await user.click(screen.getByRole('switch', { name: 'Required' }));

    expect(onDefineField).toHaveBeenCalledWith({
      name: 'title',
      type: 'text',
      default: 'Title',
      required: true,
    });
  });

  it('can clear a boolean default instead of forcing false', async () => {
    const user = userEvent.setup();
    const onDefineField = vi.fn();
    render(
      <FieldsEditorControl
        fields={[{ name: 'enabled', type: 'boolean', default: true }]}
        onDefineField={onDefineField}
        onRemoveField={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Enabled' }));
    await user.click(screen.getByRole('button', { name: 'Clear default' }));

    expect(onDefineField).toHaveBeenCalledWith({ name: 'enabled', type: 'boolean' });
  });
});
