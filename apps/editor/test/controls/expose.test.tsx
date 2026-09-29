/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExposeEditorControl } from '../../src/ui/controls/data/ExposeEditorControl.js';

describe('expose editor', () => {
  afterEach(() => cleanup());

  it('adds a public field mapping', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ExposeEditorControl onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add public mapping' }));
    await user.type(document.querySelector('input[name="new-expose-name"]')!, 'value');
    await user.type(document.querySelector('input[name="new-expose-path"]')!, 'control.value');
    await user.click(screen.getByRole('button', { name: 'Add mapping' }));

    expect(onChange).toHaveBeenCalledWith({ fields: { value: 'control.value' } });
  });

  it('clears the complete public contract', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ExposeEditorControl
        expose={{ fields: { value: 'control.value' }, events: { commit: 'control.commit' } }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Clear public contract' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
