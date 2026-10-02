/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AxisSizeEditor, axisModePatch } from '../../src/ui/controls/layout/axis-size-editor.js';

afterEach(cleanup);

it('shows Inherit independently from an effective Hug axis without writing', () => {
  const onCommit = vi.fn();
  render(
    <AxisSizeEditor
      label="Height"
      name="height"
      axis={{ mode: 'hug', min: 20 }}
      modeValue=""
      dimensionTokens={[]}
      onCommit={onCommit}
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Height' })).toHaveValue('');
  expect(screen.getByText('Inherited height: Hug')).toBeInTheDocument();
  expect(onCommit).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Height' }), { target: { value: 'auto' } });
  expect(onCommit.mock.calls).toEqual([[{ mode: 'auto', min: 20 }]]);
});

it.each([undefined, 'custom', 'hug'] as const)(
  'shows custom CSS with a disabled current option (modeValue: %s)',
  (modeValue) => {
    const onCommit = vi.fn();
    render(
      <AxisSizeEditor
        label="Height"
        name="height"
        axis={{ mode: 'hug' }}
        modeValue={modeValue}
        customValue="calc(100vh - 40px)"
        dimensionTokens={[]}
        onCommit={onCommit}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'Height' })).toHaveValue('custom');
    expect(screen.getByRole('option', { name: 'Custom CSS' })).toBeDisabled();
    expect(
      screen.getByText(/Custom CSS: calc\(100vh - 40px\). Edit in Manual CSS/),
    ).toBeInTheDocument();
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Height' }), {
      target: { value: 'auto' },
    });
    expect(onCommit.mock.calls).toEqual([[{ mode: 'auto' }]]);
  },
);

it('gives explicit Inherit priority over inherited custom CSS and keeps its value visible', () => {
  const onCommit = vi.fn();
  render(
    <AxisSizeEditor
      label="Width"
      name="width"
      axis={undefined}
      modeValue=""
      customValue="var(--card-width)"
      dimensionTokens={[]}
      onCommit={onCommit}
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Width' })).toHaveValue('');
  expect(screen.getByText('Inherited width: var(--card-width)')).toBeInTheDocument();
  expect(
    screen.getByText(/Inherited custom CSS: var\(--card-width\). Edit in Manual CSS/),
  ).toBeInTheDocument();
  expect(onCommit).not.toHaveBeenCalled();
});

it('retains Auto while editing min/max constraints', () => {
  const onCommit = vi.fn();
  const { container } = render(
    <AxisSizeEditor
      label="Height"
      name="height"
      axis={{ mode: 'auto', min: 20, max: 300 }}
      dimensionTokens={[]}
      onCommit={onCommit}
    />,
  );
  fireEvent.change(container.querySelector('select[name="layout-height-min-kind"]')!, {
    target: { value: '' },
  });
  expect(onCommit.mock.calls).toEqual([[{ mode: 'auto', max: 300 }]]);
});

it.each(['width', 'height'] as const)(
  'distinguishes explicit Auto from Inherit for %s and preserves constraints',
  (name) => {
    const onCommit = vi.fn();
    const label = name === 'width' ? 'Width' : 'Height';
    const { rerender } = render(
      <AxisSizeEditor
        label={label}
        name={name}
        axis={{ mode: 'fixed', size: 120, min: 20, max: 300 }}
        dimensionTokens={[]}
        onCommit={onCommit}
      />,
    );
    const select = screen.getByRole('combobox', { name: label });
    expect(screen.queryByRole('option', { name: 'Default' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Inherit' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Auto' })).toHaveValue('auto');
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'auto' } });
    expect(onCommit.mock.calls).toEqual([[{ mode: 'auto', min: 20, max: 300 }]]);
    rerender(
      <AxisSizeEditor
        label={label}
        name={name}
        axis={{ mode: 'auto', min: 20, max: 300 }}
        dimensionTokens={[]}
        onCommit={onCommit}
      />,
    );
    expect(screen.getByRole('combobox', { name: label })).toHaveValue('auto');
    expect(screen.queryByRole('combobox', { name: `${label} size` })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: '' } });
    expect(onCommit.mock.calls).toEqual([[{ mode: 'auto', min: 20, max: 300 }], [null]]);
  },
);

it('keeps an omitted dimension as Inherit and selects Auto without creating a fixed size', () => {
  const onCommit = vi.fn();
  render(
    <AxisSizeEditor
      label="Height"
      name="height"
      axis={undefined}
      dimensionTokens={[]}
      onCommit={onCommit}
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Height' })).toHaveValue('');
  expect(onCommit).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Height' }), { target: { value: 'auto' } });
  expect(onCommit.mock.calls).toEqual([[{ mode: 'auto' }]]);
});

it('preserves token and percent constraints across Auto and legacy modes', () => {
  const constraints = { min: '{space.2}', max: { unit: '%' as const, value: 80 } };
  expect(axisModePatch('auto', { mode: 'fixed', size: 120, ...constraints })).toEqual({
    mode: 'auto',
    ...constraints,
  });
  expect(axisModePatch('hug', { mode: 'auto', ...constraints })).toEqual({
    mode: 'hug',
    ...constraints,
  });
  expect(axisModePatch('fill', { mode: 'auto', ...constraints })).toEqual({
    mode: 'fill',
    ...constraints,
  });
  expect(axisModePatch('fixed', { mode: 'auto', ...constraints })).toEqual({
    mode: 'fixed',
    size: 100,
    ...constraints,
  });
  expect(axisModePatch('', { mode: 'auto', ...constraints })).toBeNull();
});
