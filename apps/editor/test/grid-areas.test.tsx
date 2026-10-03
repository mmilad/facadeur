// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GridAreas } from '../src/ui/sidebar/properties/layout/grid/GridAreas';
import {
  parseGridAreas,
  renameGridArea,
  serializeGridAreas,
} from '../src/ui/sidebar/properties/layout/grid/areas';

afterEach(cleanup);

it.each([
  Array.from({ length: 21 }, () => '"."').join(' '),
  `"${Array<string>(21).fill('.').join(' ')}"`,
])('preserves oversized imported rasters without rendering cell inputs', (value) => {
  const { props } = setup(value);
  expect(screen.queryByRole('group', { name: 'Area raster' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Preserved grid areas CSS')).toHaveTextContent(value);
  expect(screen.getByText(/supports up to 20 rows and 20 columns/)).toBeInTheDocument();
  expect(props.onCommit).not.toHaveBeenCalled();
});

it('caps interactive additions at 20 rows and columns without writes', () => {
  const value = Array.from({ length: 20 }, () => `"${Array<string>(20).fill('.').join(' ')}"`).join(
    ' ',
  );
  const { props } = setup(value);
  expect(screen.getByRole('button', { name: 'Add area row' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Add area column' })).toBeDisabled();
  expect(screen.getByText(/Apply edits the current variant and viewport/)).toHaveTextContent(
    /directly assigned children in this context only/,
  );
  expect(props.onCommit).not.toHaveBeenCalled();
});

it('parses quoted rectangles, empty cells and case-sensitive names in encounter order', () => {
  const parsed = parseGridAreas(`'Header Header ..' "body Body ." 'body Body footer'`);
  expect(parsed).toEqual({
    rows: [
      ['Header', 'Header', '.'],
      ['body', 'Body', '.'],
      ['body', 'Body', 'footer'],
    ],
    names: ['Header', 'body', 'Body', 'footer'],
    editable: true,
  });
  expect(parseGridAreas(serializeGridAreas(parsed.rows))).toEqual(parsed);
});

it.each(['', '  ', 'none', 'NONE'])('accepts empty/none without inventing areas: %s', (value) => {
  expect(parseGridAreas(value)).toEqual({ rows: [], names: [], editable: true });
  expect(serializeGridAreas([])).toBe('none');
});

it.each([
  ['"a a" "a ."', /rectangle/],
  ['"a a a" "a . a" "a a a"', /holes/],
  ['"a . a"', /rectangle/],
  ['"a b" "a"', /same nonzero/],
  ['""', /same nonzero/],
])('rejects nonrectangular or uneven rasters: %s', (value, message) => {
  const parsed = parseGridAreas(value);
  expect(parsed.editable).toBe(true);
  expect(parsed.error).toMatch(message);
  expect(() => serializeGridAreas(parsed.rows)).toThrow(message);
  expect(() => renameGridArea(value, 'a', 'next')).toThrow();
});

it.each([
  'none',
  'auto',
  'span',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'default',
  'AUTO',
  '1name',
  'bad/name',
  'a.b',
])('rejects invalid/reserved area name %s', (name) => {
  expect(parseGridAreas(`"${name}"`).error).toMatch(/Invalid area name/);
  expect(() => serializeGridAreas([[name]])).toThrow();
  expect(() => renameGridArea('"a"', 'a', name)).toThrow();
});

it.each(['var(--areas)', 'inherit', '"a" / 1fr', '"a\\62"', '"a', '/* manual */ "a"'])(
  'preserves unsupported CSS: %s',
  (value) => {
    expect(parseGridAreas(value)).toMatchObject({ editable: false, error: expect.any(String) });
    expect(() => renameGridArea(value, 'a', 'b')).toThrow();
  },
);

it('renames exact case-sensitive names and rejects collisions or missing names', () => {
  const source = '"a A" "a A"';
  expect(renameGridArea(source, 'a', 'new-area')).toBe('"new-area A" "new-area A"');
  expect(renameGridArea(source, 'a', 'a')).toBe(source);
  expect(() => renameGridArea(source, 'a', 'A')).toThrow(/already exists/);
  expect(() => renameGridArea(source, 'missing', 'next')).toThrow(/does not exist/);
  expect(() => renameGridArea(source, '.', 'next')).toThrow();
  expect(serializeGridAreas([['_area', '-area', '--area']])).toBe('"_area -area --area"');
});

function setup(value = '"a a"', overridden = false) {
  const props = { value, overridden, onCommit: vi.fn(), onRename: vi.fn() };
  return { ...render(<GridAreas {...props} />), props };
}

function cell(row: number, column: number, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: `Area row ${row} column ${column}` }), {
    target: { value },
  });
}

it('keeps cell and dimension edits local until a valid Apply', () => {
  const { props } = setup();
  expect(props.onCommit).not.toHaveBeenCalled();
  cell(1, 2, '.');
  fireEvent.click(screen.getByRole('button', { name: 'Add area row' }));
  cell(2, 1, 'a');
  cell(2, 2, 'a');
  fireEvent.click(screen.getByRole('button', { name: 'Apply grid areas' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/rectangle/);
  expect(props.onCommit).not.toHaveBeenCalled();
  cell(2, 2, '.');
  fireEvent.click(screen.getByRole('button', { name: 'Add area column' }));
  expect(props.onCommit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Apply grid areas' }));
  expect(props.onCommit).toHaveBeenCalledExactlyOnceWith('"a . ." "a . ."');
  expect(props.onRename).not.toHaveBeenCalled();
});

it('resyncs a new context value and never commits during render or blur', () => {
  const { props, rerender } = setup();
  cell(1, 1, 'draft');
  fireEvent.blur(screen.getByRole('textbox', { name: 'Area row 1 column 1' }));
  rerender(<GridAreas {...props} value='"next"' />);
  expect(screen.getByRole('textbox', { name: 'Area row 1 column 1' })).toHaveValue('next');
  expect(screen.queryByRole('textbox', { name: 'Area row 1 column 2' })).not.toBeInTheDocument();
  expect(props.onCommit).not.toHaveBeenCalled();
  expect(props.onRename).not.toHaveBeenCalled();
});

it('shrinks only the draft and keeps at least one row and column', () => {
  const { props } = setup('"a a" "a a"');
  fireEvent.click(screen.getByRole('button', { name: 'Remove last area row' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove last area column' }));
  expect(screen.getByRole('button', { name: 'Remove last area row' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove last area column' })).toBeDisabled();
  expect(props.onCommit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Apply grid areas' }));
  expect(props.onCommit).toHaveBeenCalledExactlyOnceWith('"a"');
});

it('calls only onRename for valid names; collisions and reserved names stay local', () => {
  const { props } = setup('"a A"');
  const input = screen.getByRole('textbox', { name: 'Rename area a' });
  for (const value of ['A', 'auto', 'bad name']) {
    fireEvent.change(input, { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename a' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  }
  expect(props.onRename).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'renamed' } });
  fireEvent.click(screen.getByRole('button', { name: 'Rename a' }));
  expect(props.onRename).toHaveBeenCalledExactlyOnceWith('a', 'renamed');
  expect(props.onCommit).not.toHaveBeenCalled();
});

it.each(['none', '', 'var(--manual-areas)'])(
  'does not write imported/default values on render: %s',
  (value) => {
    const { props } = setup(value);
    expect(props.onCommit).not.toHaveBeenCalled();
    expect(props.onRename).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Reset grid areas' })).not.toBeInTheDocument();
    if (value.startsWith('var')) {
      expect(screen.getByLabelText('Preserved grid areas CSS')).toHaveTextContent(value);
      expect(screen.queryByRole('button', { name: 'Apply grid areas' })).not.toBeInTheDocument();
    }
  },
);

it('allows repairing imported invalid rasters and resets only an owned declaration', () => {
  const { props } = setup('"a a" "a ."', true);
  expect(screen.getByRole('alert')).toHaveTextContent(/rectangle/);
  cell(2, 2, 'a');
  fireEvent.click(screen.getByRole('button', { name: 'Apply grid areas' }));
  expect(props.onCommit).toHaveBeenLastCalledWith('"a a" "a a"');
  fireEvent.click(screen.getByRole('button', { name: 'Reset grid areas' }));
  expect(props.onCommit).toHaveBeenLastCalledWith(null);
});
