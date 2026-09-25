/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ArrayField,
  Field,
  Form,
  RecordField,
  TextInput,
  Toggle,
  type FormChangeMeta,
} from '../../src/ui/form/index.js';

function TestForm({
  initial,
  onCommit,
  children,
}: {
  initial: Record<string, unknown>;
  onCommit?: (next: Record<string, unknown>, meta: FormChangeMeta) => void;
  children: ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Form value={value} onChange={(next) => setValue(next)} onCommit={onCommit}>
      {children}
    </Form>
  );
}

describe('editor form kit', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  afterEach(() => cleanup());

  it('emits change meta paths for nested values', async () => {
    const user = userEvent.setup();
    const onMeta = vi.fn();
    function Stateful() {
      const [value, setValue] = useState({ items: [{ name: 'one' }] });
      return (
        <Form
          value={value}
          onChange={(next, meta) => {
            setValue(next);
            onMeta(meta);
          }}
        >
          <ArrayField name="items" defaultItem={() => ({ name: '' })}>
            {() => <TextInput name="name" aria-label="item name" />}
          </ArrayField>
        </Form>
      );
    }
    render(<Stateful />);

    const input = screen.getByLabelText('item name');
    await user.clear(input);
    await user.type(input, 'two');
    expect(onMeta.mock.calls.at(-1)?.[0]).toMatchObject({
      path: 'items.0.name',
      next: 'two',
    });
  });

  it('sets aria-invalid when Field has an error', () => {
    render(
      <Field label="Name" htmlFor="name-field" error="Required">
        <TextInput name="name" value="" onChange={() => undefined} invalid id="name-field" />
      </Field>,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('adds and removes array rows', async () => {
    const user = userEvent.setup();
    render(
      <TestForm initial={{ items: [] }}>
        <ArrayField name="items" defaultItem={() => ({ name: 'new' })}>
          {() => <span>row</span>}
        </ArrayField>
      </TestForm>,
    );
    await user.click(screen.getByRole('button', { name: 'Add row' }));
    expect(screen.getByText('row')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove row' }));
    expect(screen.queryByText('row')).not.toBeInTheDocument();
  });

  it('adds and removes record properties', async () => {
    const user = userEvent.setup();
    render(
      <TestForm initial={{ declarations: { padding: '4px' } }}>
        <RecordField name="declarations" />
      </TestForm>,
    );
    expect(screen.getByDisplayValue('padding')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add property' }));
    const keyInputs = screen.getAllByLabelText('Property');
    const lastKey = keyInputs[keyInputs.length - 1]!;
    await user.type(lastKey, 'margin');
    await user.tab();
    const valueInputs = screen.getAllByLabelText('Value');
    await user.type(valueInputs[valueInputs.length - 1]!, '8px');
    expect(screen.getByDisplayValue('margin')).toBeInTheDocument();
    const removeButtons = screen.getAllByRole('button', { name: 'Remove property' });
    await user.click(removeButtons[0]!);
    expect(screen.queryByDisplayValue('padding')).not.toBeInTheDocument();
  });

  it('commits toggles immediately when onCommit is provided', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <TestForm initial={{ enabled: false }} onCommit={onCommit}>
        <Toggle name="enabled" label="Enabled" />
      </TestForm>,
    );
    await user.click(screen.getByRole('switch'));
    expect(onCommit).toHaveBeenCalled();
    expect(onCommit.mock.calls[0]?.[0]).toEqual({ enabled: true });
  });
});
