/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenValueControl } from '../../src/ui/controls/fields/TokenValueControl';

describe('token value control', () => {
  afterEach(() => cleanup());

  it('opens an unknown token without committing or replacing it', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <TokenValueControl
        label="Color"
        value="{future.color.surface}"
        tokens={['{color.brand}']}
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Color or token' }));

    expect(screen.getByRole('button', { name: /future\.color\.surface/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /◇ Future Color Surface.*future.color.surface/ }),
    ).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('resets the token search when reopening from the reference button', async () => {
    const user = userEvent.setup();
    render(
      <TokenValueControl
        label="Color"
        value="{color.brand}"
        tokens={['{color.brand}', '{color.surface}']}
        onCommit={vi.fn()}
      />,
    );

    const reference = screen.getByTitle('Token reference: {color.brand}');
    await user.click(reference);
    const search = screen.getByRole('searchbox', { name: 'Tokens' });
    await user.type(search, 'surface');
    expect(search).toHaveValue('surface');
    await user.keyboard('{Escape}');
    await user.click(reference);
    expect(screen.getByRole('searchbox', { name: 'Tokens' })).toHaveValue('');
  });

  it('commits a selected token', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <TokenValueControl
        label="Size"
        value="16px"
        tokens={['{space.sm}', '{space.md}']}
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Size or token' }));
    await user.click(screen.getByRole('button', { name: /◇ Md.*space.md/ }));

    expect(onCommit).toHaveBeenCalledWith('{space.md}');
  });

  it('converts a token to an explicit raw value only when submitted', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <TokenValueControl
        label="Shadow"
        value="{shadow.card}"
        tokens={['{shadow.card}']}
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Shadow or token' }));
    const direct = screen.getByRole('textbox', { name: 'Direct value' });
    await user.type(direct, '0 8px 24px var(--shadow-color)');
    expect(onCommit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Use direct value' }));

    expect(onCommit).toHaveBeenCalledWith('0 8px 24px var(--shadow-color)');
  });

  it('keeps complex CSS colors intact while the picker is open', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const value = 'color-mix(in srgb, var(--surface) 80%, white)';
    render(<TokenValueControl label="Color" value={value} tokens={[]} color onCommit={onCommit} />);

    await user.click(screen.getByRole('button', { name: 'Choose Color or token' }));
    expect(screen.getByRole('textbox', { name: 'Direct value' })).toHaveValue(value);
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('textbox', { name: 'Color' })).toHaveValue(value);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
