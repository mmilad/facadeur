/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FieldsEditorControl } from '../src/ui/controls/data/FieldsEditorControl';

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

  it('keeps preview defaults out of the shared field definition editor', async () => {
    const onDefineField = vi.fn();
    render(
      <FieldsEditorControl
        fields={[{ name: 'enabled', type: 'boolean', default: true }]}
        onDefineField={onDefineField}
        onRemoveField={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Clear default' })).toBeNull();
    expect(screen.queryByRole('switch', { name: 'On' })).toBeNull();
    expect(onDefineField).not.toHaveBeenCalled();
  });

  it('creates a field contract without a runtime default', async () => {
    const user = userEvent.setup();
    const onDefineField = vi.fn();
    render(
      <FieldsEditorControl
        fields={[]}
        onDefineField={onDefineField}
        onRemoveField={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add field' }));
    const nameInput = document.querySelector<HTMLInputElement>('input[name="new-field-name"]');
    expect(nameInput).not.toBeNull();
    await user.type(nameInput!, 'label');
    await user.click(screen.getByRole('button', { name: 'Add field' }));

    expect(onDefineField).toHaveBeenCalledWith({ name: 'label', type: 'text' });
  });

  it('authors nested fields for an array of objects', async () => {
    const user = userEvent.setup();
    const onDefineField = vi.fn();
    render(
      <FieldsEditorControl
        fields={[{ name: 'items', type: 'array', items: { type: 'object', fields: [] } }]}
        onDefineField={onDefineField}
        onRemoveField={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Items' }));
    await user.click(screen.getByRole('button', { name: 'Add nested field' }));
    const nameInput = document.querySelector<HTMLInputElement>('input[name="new-items-item-name"]');
    expect(nameInput).not.toBeNull();
    await user.type(nameInput!, 'label');
    const addNestedButton = document.querySelector<HTMLButtonElement>(
      'button[name="add-new-items-item"]',
    );
    expect(addNestedButton).not.toBeNull();
    await user.click(addNestedButton!);

    expect(onDefineField).toHaveBeenCalledWith({
      name: 'items',
      type: 'array',
      items: {
        type: 'object',
        fields: [{ name: 'label', type: 'text' }],
      },
    });
  });

  it('edits options for enum array items', async () => {
    const user = userEvent.setup();
    const onDefineField = vi.fn();
    render(
      <FieldsEditorControl
        fields={[
          {
            name: 'kinds',
            type: 'array',
            items: { type: 'enum', options: ['input', 'textarea'] },
          },
        ]}
        onDefineField={onDefineField}
        onRemoveField={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Kinds' }));
    const optionsInput = document.querySelector<HTMLInputElement>(
      'input[name="field-item-options-kinds"]',
    );
    expect(optionsInput).not.toBeNull();
    await user.clear(optionsInput!);
    await user.type(optionsInput!, 'input, checkbox');
    await user.tab();

    expect(onDefineField).toHaveBeenCalledWith({
      name: 'kinds',
      type: 'array',
      items: { type: 'enum', options: ['input', 'checkbox'] },
    });
  });
});
