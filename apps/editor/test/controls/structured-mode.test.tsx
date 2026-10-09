/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BorderRadiusControl } from '../../src/ui/controls/border/index';
import { SpacingControl } from '../../src/ui/controls/spacing/index';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('structured control display modes', () => {
  afterEach(() => cleanup());

  it('does not persist when switching spacing to per-side mode', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    const { rerender } = render(
      <SpacingControl
        legend="Padding"
        namePrefix="padding"
        spacing={fixtureTokenRef(fixtureIds.tokens.space.scale.step2)}
        dimensionTokens={[
          fixtureTokenRef(fixtureIds.tokens.space.scale.step2),
          fixtureTokenRef(fixtureIds.tokens.space.scale.step4),
        ]}
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
        spacing={{
          top: fixtureTokenRef(fixtureIds.tokens.space.scale.step2),
          right: fixtureTokenRef(fixtureIds.tokens.space.scale.step4),
        }}
        dimensionTokens={[
          fixtureTokenRef(fixtureIds.tokens.space.scale.step2),
          fixtureTokenRef(fixtureIds.tokens.space.scale.step4),
        ]}
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
        value={{ mode: 'uniform', value: fixtureTokenRef(fixtureIds.tokens.radius.md) }}
        radiusTokens={[
          fixtureTokenRef(fixtureIds.tokens.radius.md),
          fixtureTokenRef(fixtureIds.tokens.radius.lg),
        ]}
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
