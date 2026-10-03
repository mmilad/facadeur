/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GridItem } from '../src/ui/sidebar/properties/layout/grid/GridItem';

afterEach(cleanup);

it.each(['grid-column', 'grid-row'])(
  'resets %s and its generated longhands in one targeted patch',
  (axis) => {
    const onPatch = vi.fn();
    const onCommit = vi.fn();
    render(
      <GridItem
        values={{
          'grid-area': 'auto',
          'grid-column': '2 / span 3',
          'grid-column-start': '2',
          'grid-column-end': 'span 3',
          'grid-row': '4 / span 2',
          'grid-row-start': '4',
          'grid-row-end': 'span 2',
        }}
        active={false}
        onCommit={onCommit}
        onPatch={onPatch}
        overridden={() => true}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: `Reset ${axis}` }));
    expect(onPatch.mock.calls).toEqual([
      [{ [axis]: null, [`${axis}-start`]: null, [`${axis}-end`]: null }],
    ]);
    expect(onCommit).not.toHaveBeenCalled();
  },
);

it('keeps empty manual placement distinct from reset by explicitly neutralizing inherited longhands', () => {
  const onPatch = vi.fn();
  render(
    <GridItem
      values={{
        'grid-area': 'auto',
        'grid-column': '2',
        'grid-column-start': 'main',
        'grid-column-end': 'main',
      }}
      active
      onCommit={vi.fn()}
      onPatch={onPatch}
    />,
  );
  const input = screen.getByRole('textbox', { name: 'grid-column CSS' });
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  expect(onPatch.mock.calls).toEqual([
    [{ 'grid-column': null, 'grid-column-start': 'auto', 'grid-column-end': 'auto' }],
  ]);
});

const areaPatch = (value: string) => ({
  'grid-column': null,
  'grid-row': null,
  'grid-column-start': value,
  'grid-column-end': value,
  'grid-row-start': value,
  'grid-row-end': value,
  'grid-area': value,
});

it('lists only parent names, preserves case, and updates viewport choices without writing', () => {
  const onCommit = vi.fn();
  const onPatch = vi.fn();
  const { rerender } = render(
    <GridItem
      values={{}}
      active
      onCommit={onCommit}
      onPatch={onPatch}
      areaNames={['Header', 'header', 'Header']}
    />,
  );
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Auto',
    'Header',
    'header',
  ]);
  expect(screen.getByRole('combobox', { name: 'Grid area' })).toHaveValue('auto');
  rerender(
    <GridItem values={{}} active onCommit={onCommit} onPatch={onPatch} areaNames={['footer']} />,
  );
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Auto',
    'footer',
  ]);
  expect(onCommit).not.toHaveBeenCalled();
  expect(onPatch).not.toHaveBeenCalled();
});

it('retains missing names and reports parent viewport and template errors without writes', () => {
  const onCommit = vi.fn();
  const onPatch = vi.fn();
  render(
    <GridItem
      values={{ 'grid-area': 'Header' }}
      active
      onCommit={onCommit}
      onPatch={onPatch}
      areaNames={['header']}
      areaTemplateError="Parent template is invalid"
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Grid area' })).toHaveValue('Header');
  expect(screen.getByRole('option', { name: 'Header (current)' })).toBeInTheDocument();
  expect(
    screen.getByText(/Header.*missing from this parent at the current viewport/),
  ).toBeInTheDocument();
  expect(screen.getByText('Parent template is invalid')).toBeInTheDocument();
  expect(onPatch).not.toHaveBeenCalled();
  expect(onCommit).not.toHaveBeenCalled();
});

it.each(['Header', 'auto'])(
  'assigns %s with one atomic patch overriding inherited placement with consistent longhands',
  (area) => {
    const onCommit = vi.fn();
    const onPatch = vi.fn();
    render(
      <GridItem
        values={{ 'grid-area': 'old', 'grid-column': '2 / span 2', 'grid-row-start': '3' }}
        active
        onCommit={onCommit}
        onPatch={onPatch}
        areaNames={['Header']}
      />,
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Grid area' }), {
      target: { value: area },
    });
    expect(onPatch.mock.calls).toEqual([[areaPatch(area)]]);
    expect(onCommit).not.toHaveBeenCalled();
  },
);

it('retains complex area CSS and writes consistent explicit longhands on raw edits', () => {
  const onCommit = vi.fn();
  const onPatch = vi.fn();
  render(
    <GridItem
      values={{ 'grid-area': '1 / 2 / 3 / 4' }}
      active
      onCommit={onCommit}
      onPatch={onPatch}
      areaNames={['main']}
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Grid area' })).toHaveValue('1 / 2 / 3 / 4');
  expect(screen.getByRole('option', { name: '1 / 2 / 3 / 4 (current)' })).toBeInTheDocument();
  expect(screen.queryByText(/missing from this parent/)).not.toBeInTheDocument();
  const input = screen.getByRole('textbox', { name: 'grid-area CSS' });
  fireEvent.change(input, { target: { value: '2 / 3 / 4 / 5' } });
  fireEvent.blur(input);
  expect(onPatch.mock.calls).toEqual([
    [
      {
        'grid-area': '2 / 3 / 4 / 5',
        'grid-column': null,
        'grid-row': null,
        'grid-row-start': '2',
        'grid-column-start': '3',
        'grid-row-end': '4',
        'grid-column-end': '5',
      },
    ],
  ]);
});

it('uses atomic assignment for a name entered in the raw field', () => {
  const onPatch = vi.fn();
  render(<GridItem values={{}} active onCommit={vi.fn()} onPatch={onPatch} areaNames={['main']} />);
  const input = screen.getByRole('textbox', { name: 'grid-area CSS' });
  fireEvent.change(input, { target: { value: 'main' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.blur(input);
  expect(onPatch.mock.calls).toEqual([[areaPatch('main')]]);
});

it('overrides inherited named longhands on manual placement even when grid-area is auto', () => {
  const onPatch = vi.fn();
  render(
    <GridItem
      values={{ 'grid-area': 'auto', 'grid-column-start': 'main', 'grid-column-end': 'main' }}
      active
      onCommit={vi.fn()}
      onPatch={onPatch}
      overridden={() => false}
    />,
  );
  const input = screen.getByRole('textbox', { name: 'grid-column CSS' });
  fireEvent.change(input, { target: { value: '4' } });
  fireEvent.blur(input);
  expect(onPatch.mock.calls).toEqual([
    [
      {
        'grid-column': '4',
        'grid-column-start': '4',
        'grid-column-end': 'auto',
      },
    ],
  ]);
});

it.each([
  [{ 'grid-row-start': '7', 'grid-row-end': 'span 3', 'grid-row': '2 / 8' }, '7', 'span 3'],
  [{ 'grid-row': '2 / 8' }, '2', '8'],
  [{ 'grid-row-start': '7', 'grid-row': '2 / 8' }, '7', '8'],
  [{}, 'main', 'main'],
])(
  'preserves the other axis using effective longhands, shorthand, then area name (%j)',
  (otherValues, start, end) => {
    const onPatch = vi.fn();
    render(
      <GridItem
        values={{ 'grid-area': 'main', ...otherValues }}
        active
        onCommit={vi.fn()}
        onPatch={onPatch}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'grid-column CSS' });
    fireEvent.change(input, { target: { value: '5 / span 2' } });
    fireEvent.blur(input);
    expect(onPatch.mock.calls).toEqual([
      [
        {
          'grid-area': 'auto',
          'grid-column': '5 / span 2',
          'grid-column-start': '5',
          'grid-column-end': 'span 2',
          'grid-row-start': start,
          'grid-row-end': end,
        },
      ],
    ]);
  },
);

it.each([
  ['2', '2', 'auto', 'auto', 'auto'],
  ['2 / 3', '2', '3', 'auto', 'auto'],
  ['2 / 3 / 4', '2', '3', '4', 'auto'],
])(
  'normalizes abbreviated numeric grid-area %s with explicit auto defaults',
  (value, rowStart, columnStart, rowEnd, columnEnd) => {
    const onPatch = vi.fn();
    render(
      <GridItem
        values={{ 'grid-area': 'main', 'grid-row-start': 'main', 'grid-column-end': 'main' }}
        active
        onCommit={vi.fn()}
        onPatch={onPatch}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'grid-area CSS' });
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
    expect(onPatch.mock.calls).toEqual([
      [
        {
          'grid-area': value,
          'grid-row': null,
          'grid-column': null,
          'grid-row-start': rowStart,
          'grid-column-start': columnStart,
          'grid-row-end': rowEnd,
          'grid-column-end': columnEnd,
        },
      ],
    ]);
  },
);

it('resets area assignment longhands together without resetting unrelated axis shorthands', () => {
  const onPatch = vi.fn();
  render(
    <GridItem
      values={{
        'grid-area': 'main',
        'grid-column': '7',
        'grid-column-start': 'main',
        'grid-column-end': 'main',
        'grid-row-start': 'main',
        'grid-row-end': 'main',
      }}
      active
      onCommit={vi.fn()}
      onPatch={onPatch}
      overridden={() => true}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset grid-area' }));
  expect(onPatch.mock.calls).toEqual([
    [
      {
        'grid-area': null,
        'grid-column-start': null,
        'grid-column-end': null,
        'grid-row-start': null,
        'grid-row-end': null,
      },
    ],
  ]);
});

it.each([
  ['grid-column', 'CSS', '5 / span 3', '5 / span 3'],
  ['grid-column', 'start', '5', '5 / span 2'],
  ['grid-column', 'span', '3', '2 / span 3'],
  ['grid-row', 'CSS', '5 / span 3', '5 / span 3'],
  ['grid-row', 'start', '5', '5 / span 2'],
  ['grid-row', 'span', '3', '2 / span 3'],
])(
  'edits %s %s atomically out of a named area while preserving the other axis',
  (axis, field, draft, expected) => {
    const onPatch = vi.fn();
    const onCommit = vi.fn();
    const values = {
      'grid-area': 'main',
      'grid-column': '2 / span 2',
      'grid-row': '2 / span 2',
      'grid-column-start': 'main',
      'grid-column-end': 'main',
      'grid-row-start': 'main',
      'grid-row-end': 'main',
    };
    render(
      <GridItem
        values={values}
        active
        onCommit={onCommit}
        onPatch={onPatch}
        overridden={() => false}
        areaNames={['main']}
      />,
    );
    expect(
      screen.getByText(
        `Inherited ${axis}: 2 / span 2. This value is retained in the underlying style layer.`,
      ),
    ).toBeInTheDocument();
    expect(onPatch).not.toHaveBeenCalled();
    const input = screen.getByRole('textbox', { name: `${axis} ${field}` });
    fireEvent.change(input, { target: { value: draft } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(onPatch.mock.calls).toEqual([
      [
        {
          'grid-area': 'auto',
          [axis]: expected,
          [`${axis}-start`]: expected.split('/')[0]!.trim(),
          [`${axis}-end`]: expected.split('/')[1]!.trim(),
          [`${axis === 'grid-column' ? 'grid-row' : 'grid-column'}-start`]: 'main',
          [`${axis === 'grid-column' ? 'grid-row' : 'grid-column'}-end`]: 'main',
        },
      ],
    ]);
    expect(onCommit).not.toHaveBeenCalled();
    const otherAxis = axis === 'grid-column' ? 'grid-row' : 'grid-column';
    expect(screen.getByRole('textbox', { name: `${otherAxis} CSS` })).toHaveValue('2 / span 2');
  },
);

it('clears a missing named area on manual edits and warns in the single-commit fallback', () => {
  const onCommit = vi.fn();
  const onPatch = vi.fn();
  const { rerender } = render(
    <GridItem values={{ 'grid-area': 'missing' }} active onCommit={onCommit} onPatch={onPatch} />,
  );
  const input = screen.getByRole('textbox', { name: 'grid-column CSS' });
  fireEvent.change(input, { target: { value: '4' } });
  fireEvent.blur(input);
  expect(onPatch.mock.calls).toEqual([
    [
      {
        'grid-area': 'auto',
        'grid-column': '4',
        'grid-column-start': '4',
        'grid-column-end': 'auto',
        'grid-row-start': 'missing',
        'grid-row-end': 'missing',
      },
    ],
  ]);
  rerender(<GridItem values={{ 'grid-area': 'missing' }} active onCommit={onCommit} />);
  expect(screen.getByText(/Editing grid-row retains grid-area missing/)).toBeInTheDocument();
  const row = screen.getByRole('textbox', { name: 'grid-row CSS' });
  fireEvent.change(row, { target: { value: '3' } });
  fireEvent.blur(row);
  expect(onCommit.mock.calls).toEqual([['grid-row', '3']]);
});

it('falls back to a single grid-area commit when atomic patches are unavailable', () => {
  const onCommit = vi.fn();
  render(
    <GridItem values={{ 'grid-column': '2' }} active onCommit={onCommit} areaNames={['main']} />,
  );
  fireEvent.change(screen.getByRole('combobox', { name: 'Grid area' }), {
    target: { value: 'main' },
  });
  expect(onCommit.mock.calls).toEqual([['grid-area', 'main']]);
  expect(
    screen.getByText(/Area changes retain existing row and column placement/),
  ).toBeInTheDocument();
});

it('only resets an owned area override, retaining inactive values and other placement', () => {
  const onPatch = vi.fn();
  const onCommit = vi.fn();
  const { rerender } = render(
    <GridItem
      values={{ 'grid-area': 'main' }}
      active={false}
      onCommit={onCommit}
      onPatch={onPatch}
    />,
  );
  expect(screen.getByRole('combobox', { name: 'Grid area' })).toBeDisabled();
  expect(screen.getByRole('textbox', { name: 'grid-area CSS' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Reset grid-area' })).not.toBeInTheDocument();
  rerender(
    <GridItem
      values={{ 'grid-area': 'main' }}
      active={false}
      onCommit={onCommit}
      onPatch={onPatch}
      overridden={(property) => property === 'grid-area'}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset grid-area' }));
  expect(onPatch.mock.calls).toEqual([
    [
      {
        'grid-area': null,
        'grid-column-start': null,
        'grid-column-end': null,
        'grid-row-start': null,
        'grid-row-end': null,
      },
    ],
  ]);
  expect(onCommit).not.toHaveBeenCalled();
});

it('shows automatic defaults without creating declarations', () => {
  const onCommit = vi.fn();
  render(<GridItem values={{}} active onCommit={onCommit} />);
  expect(screen.getByRole('textbox', { name: 'grid-column CSS' })).toHaveAttribute(
    'placeholder',
    'auto',
  );
  expect(screen.getByRole('button', { name: 'justify-self: auto' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: 'align-self: auto' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(onCommit).not.toHaveBeenCalled();
});

it('commits start/span shorthand once and retains the other axis', () => {
  const onCommit = vi.fn();
  render(
    <GridItem
      values={{ 'grid-column': '2 / span 2', 'grid-row': '3' }}
      active
      onCommit={onCommit}
    />,
  );
  const input = screen.getByRole('textbox', { name: 'grid-column span' });
  fireEvent.change(input, { target: { value: '4' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.blur(input);
  expect(onCommit.mock.calls).toEqual([['grid-column', '2 / span 4']]);
  expect(screen.getByRole('textbox', { name: 'grid-row CSS' })).toHaveValue('3');
});

it('retains imported CSS and unknown alignment through render and context changes', () => {
  const onCommit = vi.fn();
  const values = { 'grid-column': 'content-start / content-end', 'align-self': 'safe center' };
  const { rerender } = render(<GridItem values={values} active onCommit={onCommit} />);
  expect(screen.getByRole('textbox', { name: 'grid-column CSS' })).toHaveValue(
    values['grid-column'],
  );
  expect(screen.getByText('Current CSS value: safe center')).toBeInTheDocument();
  rerender(<GridItem values={values} active={false} onCommit={onCommit} />);
  expect(screen.getByRole('textbox', { name: 'grid-column CSS' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'align-self: center' })).toBeDisabled();
  expect(onCommit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reset grid-column' }));
  expect(onCommit).toHaveBeenCalledWith('grid-column', null);
});

it('passes raw CSS and alignment changes as sparse patches when provided', () => {
  const onCommit = vi.fn();
  const onPatch = vi.fn();
  render(<GridItem values={{}} active onCommit={onCommit} onPatch={onPatch} />);
  const input = screen.getByRole('textbox', { name: 'grid-row CSS' });
  fireEvent.change(input, { target: { value: '2 / span 2' } });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole('button', { name: 'justify-self: end' }));
  fireEvent.click(screen.getByRole('button', { name: 'align-self: start' }));
  expect(onPatch.mock.calls).toEqual([
    [{ 'grid-row': '2 / span 2', 'grid-row-start': '2', 'grid-row-end': 'span 2' }],
    [{ 'justify-self': 'end' }],
    [{ 'align-self': 'start' }],
  ]);
  expect(onCommit).not.toHaveBeenCalled();
});

it('resets only owned overrides and cancels drafts without committing', () => {
  const onCommit = vi.fn();
  render(
    <GridItem
      values={{ 'grid-column': '2', 'grid-row': '4' }}
      active
      onCommit={onCommit}
      overridden={(property) => property === 'grid-column'}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Reset grid-row' })).not.toBeInTheDocument();
  const input = screen.getByRole('textbox', { name: 'grid-column CSS' });
  fireEvent.change(input, { target: { value: '5' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  fireEvent.blur(input);
  expect(onCommit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reset grid-column' }));
  expect(onCommit.mock.calls).toEqual([['grid-column', null]]);
});

it('rejects invalid spans and updates fields from controlled values', () => {
  const onCommit = vi.fn();
  const { rerender } = render(
    <GridItem values={{ 'grid-column': '2 / span 2' }} active onCommit={onCommit} />,
  );
  const input = screen.getByRole('textbox', { name: 'grid-column span' });
  fireEvent.change(input, { target: { value: '0' } });
  fireEvent.blur(input);
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(onCommit).not.toHaveBeenCalled();
  rerender(<GridItem values={{ 'grid-column': '5 / span 3' }} active onCommit={onCommit} />);
  expect(screen.getByRole('textbox', { name: 'grid-column start' })).toHaveValue('5');
  expect(screen.getByRole('textbox', { name: 'grid-column span' })).toHaveValue('3');
});
