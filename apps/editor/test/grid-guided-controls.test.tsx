/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GridContainer } from '../src/ui/sidebar/properties/layout/grid/GridContainer';
import { GridItem } from '../src/ui/sidebar/properties/layout/grid/GridItem';
afterEach(cleanup);
it('shows one guided column control and equal rows without duplicate CSS inputs', () => {
  const onCommit = vi.fn();
  render(
    <GridContainer
      guidedOnly
      values={{ 'grid-template-columns': 'repeat(3, minmax(0, 1fr))' }}
      dimensionTokens={[]}
      onCommit={onCommit}
    />,
  );
  expect(screen.getByRole('spinbutton', { name: 'Equal columns count' })).toHaveValue(3);
  expect(screen.queryByRole('textbox', { name: 'Custom column tracks' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Custom row tracks' })).not.toBeInTheDocument();
  const rows = screen.getByRole('spinbutton', { name: 'Equal rows count' });
  fireEvent.change(rows, { target: { value: '2' } });
  fireEvent.blur(rows);
  expect(onCommit).toHaveBeenCalledWith('grid-template-rows', 'repeat(2, minmax(0, 1fr))');
});
it('uses effective placement longhands in guided fields and retains area selection without raw CSS', () => {
  render(
    <GridItem
      guidedOnly
      active
      values={{
        'grid-column': '1 / span 2',
        'grid-column-start': '3',
        'grid-column-end': 'span 4',
      }}
      areaNames={['content']}
      onCommit={vi.fn()}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'grid-column start' })).toHaveValue('3');
  expect(screen.getByRole('textbox', { name: 'grid-column span' })).toHaveValue('4');
  expect(screen.queryByRole('textbox', { name: 'grid-column CSS' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'grid-area CSS' })).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Grid area' })).toBeInTheDocument();
});
