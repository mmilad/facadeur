/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { StrictMode, type ComponentProps } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toFlat, validateCatalog } from '@facadeur/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { layoutCapabilities } from '../../src/domain/layout-capabilities.js';
import { LayoutControl } from '../../src/ui/controls/layout/LayoutControl.js';

type Props = ComponentProps<typeof LayoutControl>;
function setup(overrides: Partial<Props> = {}) {
  const onCommit = vi.fn();
  const onDisplayModeCommit = vi.fn();
  const props: Props = {
    value: {
      isFrame: true,
      position: 'auto',
      direction: 'row',
      justify: 'start',
      align: 'stretch',
    },
    dimensionTokens: [],
    writingBreakpointId: null,
    section: 'layout',
    displayMode: 'flex',
    onCommit,
    onDisplayModeCommit,
    ...overrides,
  };
  const view = render(
    <StrictMode>
      <LayoutControl {...props} />
    </StrictMode>,
  );
  return { ...view, props, onCommit, onDisplayModeCommit, user: userEvent.setup() };
}

afterEach(cleanup);

describe('layout icon controls', () => {
  it('selects the explicit direction, commits direction patches and retains Default', async () => {
    const { user, onCommit, rerender, props } = setup();
    expect(screen.getByRole('button', { name: 'Horizontal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Vertical' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'Vertical' }));
    expect(onCommit).toHaveBeenLastCalledWith({ direction: 'column' });
    rerender(<LayoutControl {...props} value={{ ...props.value, direction: 'column' }} />);
    expect(screen.getByRole('button', { name: 'Vertical' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(onCommit).toHaveBeenLastCalledWith({ direction: 'row' });
    await user.click(screen.getByRole('button', { name: 'Inherit direction' }));
    expect(onCommit).toHaveBeenLastCalledWith({ direction: null });
    rerender(<LayoutControl {...props} value={{ ...props.value, direction: undefined }} />);
    expect(screen.getByRole('button', { name: 'Inherit direction' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('group', { name: 'Main axis (Vertical)' })).toBeInTheDocument();
  });

  it.each(['row', 'column'] as const)(
    'labels axes for %s and commits only the chosen alignment field',
    async (direction) => {
      const { user, onCommit } = setup({
        value: { isFrame: true, position: 'auto', direction, justify: 'start', align: 'stretch' },
      });
      const main = `Main axis (${direction === 'row' ? 'Horizontal' : 'Vertical'})`;
      const cross = `Cross axis (${direction === 'row' ? 'Vertical' : 'Horizontal'})`;
      expect(screen.getByRole('group', { name: main })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: cross })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `${main}: Start` })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: `${cross}: Stretch` })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      for (const [label, justify] of [
        ['Start', 'start'],
        ['Center', 'center'],
        ['End', 'end'],
        ['Space between', 'space-between'],
        ['Default', null],
      ] as const) {
        await user.click(screen.getByRole('button', { name: `${main}: ${label}` }));
        expect(onCommit).toHaveBeenLastCalledWith({ justify });
      }
      for (const [label, align] of [
        ['Start', 'start'],
        ['Center', 'center'],
        ['End', 'end'],
        ['Stretch', 'stretch'],
        ['Default', null],
      ] as const) {
        await user.click(screen.getByRole('button', { name: `${cross}: ${label}` }));
        expect(onCommit).toHaveBeenLastCalledWith({ align });
      }
      expect(onCommit).toHaveBeenCalledTimes(10);
    },
  );

  it('commits None and Flex through the mode callback, leaves Grid disabled and renders the reset cue', async () => {
    const reset = vi.fn();
    const { user, onCommit, onDisplayModeCommit, rerender, props } = setup({
      displayModeReset: <button onClick={() => reset(null)}>Reset layout mode</button>,
    });
    expect(screen.getByRole('button', { name: 'Flex' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Grid' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Grid' }));
    expect(onDisplayModeCommit).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('group', { name: 'Layout mode' })).getByRole('button', {
        name: 'None',
      }),
    );
    expect(onDisplayModeCommit).toHaveBeenLastCalledWith('flow');
    rerender(<LayoutControl {...props} displayMode="flow" />);
    expect(
      within(screen.getByRole('group', { name: 'Layout mode' })).getByRole('button', {
        name: 'None',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Flex' }));
    expect(onDisplayModeCommit).toHaveBeenLastCalledWith('flex');
    await user.click(screen.getByRole('button', { name: 'Reset layout mode' }));
    expect(reset).toHaveBeenCalledExactlyOnceWith(null);
    expect(onCommit).not.toHaveBeenCalled();
    rerender(<LayoutControl {...props} displayMode="grid" />);
    expect(screen.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Grid' })).toBeDisabled();
  });

  it('disables mode choices when no mode callback is available', async () => {
    const { user, onCommit } = setup({ onDisplayModeCommit: undefined });
    for (const name of ['None', 'Flex', 'Grid']) {
      const button = within(screen.getByRole('group', { name: 'Layout mode' })).getByRole(
        'button',
        { name },
      );
      expect(button).toBeDisabled();
      await user.click(button);
    }
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('keeps inactive retained values visible and disabled while their reset remains usable', async () => {
    const capabilities = layoutCapabilities({
      document: toFlat(
        validateCatalog([
          {
            version: 1,
            id: 'test',
            name: 'Test',
            kind: 'component',
            root: { id: 'root', type: 'frame', children: [] },
          },
        ])[0]!,
      ),
      nodeId: 'root',
      styleDeclarations: { root: { display: 'block' } },
    });
    const reset = vi.fn();
    const { user, onCommit } = setup({
      capabilities,
      displayMode: 'flow',
      resetField: (field) => <button onClick={() => reset(field)}>Reset {field}</button>,
    });
    for (const name of [
      'Horizontal',
      'Vertical',
      'Main axis (Horizontal): Center',
      'Cross axis (Vertical): Stretch',
    ]) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      await user.click(button);
    }
    expect(onCommit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reset direction' }));
    expect(reset).toHaveBeenCalledExactlyOnceWith('direction');
  });

  it('does not commit during initial render, StrictMode replay or value and axis rerenders', () => {
    const { onCommit, onDisplayModeCommit, props, rerender } = setup();
    rerender(
      <StrictMode>
        <LayoutControl
          {...props}
          displayMode="flow"
          value={{ ...props.value, direction: 'column', justify: 'center', align: 'end' }}
        />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <LayoutControl {...props} value={{ isFrame: true, position: 'auto' }} />
      </StrictMode>,
    );
    expect(onCommit).not.toHaveBeenCalled();
    expect(onDisplayModeCommit).not.toHaveBeenCalled();
  });
});
