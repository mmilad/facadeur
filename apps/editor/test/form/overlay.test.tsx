/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Modal, Popover } from '../../src/ui/form/index.js';

describe('form overlays', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  it('opens and closes a popover', async () => {
    const user = userEvent.setup();
    render(
      <Popover trigger={<button type="button">Open popover</button>}>
        <p>Popover body</p>
      </Popover>,
    );
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open popover' }));
    expect(screen.getByText('Popover body')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
  });

  it('opens and closes a modal', async () => {
    const user = userEvent.setup();
    render(
      <Modal open={true} onOpenChange={() => undefined} title="Add item">
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
    await user.keyboard('{Escape}');
  });
});
