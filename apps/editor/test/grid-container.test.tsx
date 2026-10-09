// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GridContainer } from '../src/ui/sidebar/properties/layout/grid/GridContainer';
import { tokenRef as fixtureTokenRef } from '@facadeur/examples';

afterEach(cleanup);

function setup(values: Record<string, string> = {}, overridden?: (property: string) => boolean) {
  const onCommit = vi.fn();
  const onPatch = vi.fn();
  const props = { values, dimensionTokens: [fixtureTokenRef(testUuid25)], onCommit, onPatch, overridden };
  const view = render(<GridContainer {...props} />);
  return { ...view, props, onCommit, onPatch };
}

function edit(label: string, value: string) {
  const input = screen.getByRole('textbox', { name: label });
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

it.each([
  '200px 1fr',
  '[start] repeat(3, minmax(0, 1fr))',
  'repeat(auto-fit, minmax(100px, 1fr))',
  'repeat(3, 1fr)',
  'repeat(0, minmax(0, 1fr))',
  'repeat(2.5, minmax(0, 1fr))',
  '{grid.columns}',
  'subgrid',
])('preserves custom column CSS without render or blur writes: %s', (columns) => {
  const { onCommit, onPatch, rerender, props } = setup({ 'grid-template-columns': columns });
  expect(screen.getByRole('spinbutton', { name: 'Equal columns count' })).toHaveValue(null);
  expect(screen.getByRole('textbox', { name: 'Custom column tracks' })).toHaveValue(columns);
  fireEvent.blur(screen.getByRole('textbox', { name: 'Custom column tracks' }));
  rerender(<GridContainer {...props} values={{ 'grid-template-columns': '100px 2fr' }} />);
  expect(screen.getByRole('textbox', { name: 'Custom column tracks' })).toHaveValue('100px 2fr');
  expect(onCommit).not.toHaveBeenCalled();
  expect(onPatch).not.toHaveBeenCalled();
});

it('recognizes supported equal syntax and commits only valid positive integer counts', () => {
  const { onCommit } = setup({ 'grid-template-columns': ' repeat( 3, minmax( 0, 1fr ) ) ' });
  const input = screen.getByRole('spinbutton', { name: 'Equal columns count' });
  expect(input).toHaveValue(3);
  for (const value of ['0', '-1', '1.5', '']) {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
  }
  expect(onCommit).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '4' } });
  fireEvent.blur(input);
  expect(onCommit).toHaveBeenCalledExactlyOnceWith(
    'grid-template-columns',
    'repeat(4, minmax(0, 1fr))',
  );
});

it('commits raw columns, custom and auto rows, token gaps and null resets independently', () => {
  const { onCommit } = setup();
  edit('Custom column tracks', '[main] 10rem minmax(0, 2fr)');
  edit('Custom row tracks', 'min-content 1fr');
  fireEvent.click(screen.getByRole('button', { name: 'Use auto rows' }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose Column gap token or token' }));
  expect(screen.queryByRole('textbox', { name: 'Direct value' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Small/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose Row gap token or token' }));
  fireEvent.click(screen.getByRole('button', { name: /Small/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Choose Row gap token or token' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear value' }));
  expect(onCommit.mock.calls).toEqual([
    ['grid-template-columns', '[main] 10rem minmax(0, 2fr)'],
    ['grid-template-rows', 'min-content 1fr'],
    ['grid-template-rows', 'auto'],
    ['column-gap', fixtureTokenRef(testUuid25)],
    ['row-gap', fixtureTokenRef(testUuid25)],
    ['row-gap', null],
  ]);
});

it('preserves and selects dimension token references without rewriting them', () => {
  const { container, onCommit } = setup({ 'column-gap': fixtureTokenRef(testUuid26) });
  expect(container.querySelector('button[name="grid-column-gap-token"]')).toHaveAttribute(
    'title',
    "Token reference: " + fixtureTokenRef(testUuid26),
  );
  fireEvent.click(container.querySelector('button[name="grid-column-gap-token"]')!);
  fireEvent.click(screen.getByRole('button', { name: /Small/ }));
  expect(onCommit).toHaveBeenCalledExactlyOnceWith('column-gap', fixtureTokenRef(testUuid25));
});

it.each([
  ['8px 16px', '8px', '16px'],
  [fixtureTokenRef(testUuid25), fixtureTokenRef(testUuid25), fixtureTokenRef(testUuid25)],
  ['calc(8px + 2px) var(--column-gap, 16px)', 'calc(8px + 2px)', 'var(--column-gap, 16px)'],
  ['8px 16px 24px', '', ''],
  ['calc(8px + 2px', '', ''],
])('displays gap shorthand cautiously without creating declarations: %s', (gap, row, column) => {
  const { container, onCommit, onPatch, props, rerender } = setup({ gap });
  const rowControl = container.querySelector('button[name="grid-row-gap-token"]')!;
  const columnControl = container.querySelector('button[name="grid-column-gap-token"]')!;
  if (row.startsWith('{')) expect(rowControl).toHaveAttribute('title', `Token reference: ${row}`);
  else expect(rowControl).toHaveTextContent(row || 'Inherited');
  if (column.startsWith('{'))
    expect(columnControl).toHaveAttribute('title', `Token reference: ${column}`);
  else expect(columnControl).toHaveTextContent(column || 'Inherited');
  expect(screen.queryByRole('textbox', { name: /gap CSS value/ })).not.toBeInTheDocument();
  expect(onCommit).not.toHaveBeenCalled();
  expect(onPatch).not.toHaveBeenCalled();
  rerender(<GridContainer {...props} values={{ gap, 'row-gap': '0', 'column-gap': '2rem' }} />);
  expect(rowControl).toHaveTextContent('0');
  expect(columnControl).toHaveTextContent('2rem');
});

it('does not persist default columns, rows, gaps or alignment on activation', () => {
  const { onCommit, onPatch } = setup();
  expect(onCommit).not.toHaveBeenCalled();
  expect(onPatch).not.toHaveBeenCalled();
});

it('shows manual alignment, commits item/content icons, and resets only owned properties', () => {
  const { onCommit } = setup(
    { 'justify-items': 'baseline', 'align-items': 'center', 'row-gap': '12px' },
    (property) => property === 'justify-items',
  );
  expect(screen.getByText('Current CSS value: baseline')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Vertical items: center' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.queryByRole('button', { name: 'Reset row-gap' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Horizontal items: stretch' }));
  fireEvent.click(screen.getByRole('button', { name: 'Vertical items: end' }));
  fireEvent.click(screen.getByRole('button', { name: 'Horizontal content: space-evenly' }));
  fireEvent.click(screen.getByRole('button', { name: 'Vertical content: space-around' }));
  fireEvent.click(screen.getByRole('button', { name: 'Horizontal content: Default' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset justify-items' }));
  expect(onCommit.mock.calls).toEqual([
    ['justify-items', 'stretch'],
    ['align-items', 'end'],
    ['justify-content', 'space-evenly'],
    ['align-content', 'space-around'],
    ['justify-content', null],
    ['justify-items', null],
  ]);
});
