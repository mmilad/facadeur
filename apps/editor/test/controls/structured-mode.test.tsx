/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BorderRadiusControl } from '../../src/ui/controls/border/index';
import { SpacingControl } from '../../src/ui/controls/spacing/index';

describe('structured control display modes', () => {
  afterEach(() => cleanup());

  it('does not persist when switching spacing to per-side mode', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(
      <SpacingControl
        legend="Padding"
        namePrefix="padding"
        spacing="{space.2}"
        dimensionTokens={['{space.2}', '{space.4}']}
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Per side' }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.querySelector('button[name="padding-top"]')).toBeInTheDocument();

    rerender(
      <SpacingControl
        legend="Padding"
        namePrefix="padding"
        spacing={{ top: '{space.2}', right: '{space.4}' }}
        dimensionTokens={['{space.2}', '{space.4}']}
        onCommit={onCommit}
      />,
    );
    expect(document.querySelector('button[name="padding-right"]')).toHaveTextContent('◇ 4');
  });

  it('does not persist when switching radius to per-corner mode', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <BorderRadiusControl
        namePrefix="radius"
        value={{ mode: 'uniform', value: '{radius.md}' }}
        radiusTokens={['{radius.md}', '{radius.lg}']}
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Per corner' }));

    expect(onCommit).not.toHaveBeenCalled();
    expect(document.querySelector('button[name="radius-radius-topLeft"]')).toHaveTextContent(
      '◇ Md',
    );
  });
});
