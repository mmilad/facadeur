/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenValueControl } from '../../src/ui/controls/fields/TokenValueControl';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('token value control', () => {
  afterEach(() => cleanup());

  it('opens an unknown token without committing or replacing it', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <TokenValueControl
        label="Color"
        value={fixtureTokenRef(fixtureIds.tokens.color.blue._500)}
        tokens={[fixtureTokenRef(fixtureIds.tokens.font.inter)]}
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Color' }));

    expect(screen.getByRole('option', { name: /Token 550e8400/ })).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('resets the token search when reopening from the reference button', async () => {
    const user = userEvent.setup();
    const font = fixtureTokenRef(fixtureIds.tokens.font.inter);
    render(
      <TokenValueControl
        label="Color"
        value={font}
        tokens={[font, fixtureTokenRef(fixtureIds.tokens.color.blue._500)]}
        onCommit={vi.fn()}
      />,
    );

    const reference = screen.getByRole('button', { name: 'Choose Color' });
    await user.click(reference);
    const search = screen.getByRole('searchbox', { name: 'Search Choose Color' });
    await user.type(search, 'token');
    expect(search).toHaveValue('token');
    await user.keyboard('{Escape}');
    await user.click(reference);
    expect(screen.getByRole('searchbox', { name: 'Search Choose Color' })).toHaveValue('');
  });

  it('commits a selected token', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const font = fixtureTokenRef(fixtureIds.tokens.font.inter);
    render(
      <TokenValueControl
        label="Size"
        value="16px"
        tokens={[fixtureTokenRef(fixtureIds.tokens.color.blue._500), font]}
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Size' }));
    await user.click(screen.getByRole('option', { name: /Token 0498c315/ }));

    expect(onCommit).toHaveBeenCalledWith(font);
  });

  it('commits a raw value on blur after switching from a token reference', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const shadow = fixtureTokenRef(fixtureIds.tokens.shadow.md);
    render(
      <TokenValueControl label="Shadow" value={shadow} tokens={[shadow]} onCommit={onCommit} />,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Shadow' }));
    await user.click(screen.getByRole('button', { name: 'Edit as direct value' }));
    const direct = screen.getByRole('textbox', { name: 'Shadow' });
    await user.type(direct, '0 8px 24px var(--shadow-color)');
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();

    expect(onCommit).toHaveBeenCalledWith('0 8px 24px var(--shadow-color)');
  });

  it('keeps complex CSS colors intact while the picker is open', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const value = 'color-mix(in srgb, var(--surface) 80%, white)';
    render(
      <TokenValueControl
        label="Color"
        value={value}
        tokens={[fixtureTokenRef(fixtureIds.tokens.color.blue._500)]}
        color
        onCommit={onCommit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Choose Color' }));
    expect(screen.getByRole('textbox', { name: 'Color' })).toHaveValue(value);
    expect(onCommit).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('textbox', { name: 'Color' })).toHaveValue(value);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
