// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CssDeclarationsControl } from '../../src/ui/controls/generic/CssDeclarationsControl.js';
import { layoutCapabilities } from '../../src/domain/layout-capabilities.js';
import { toFlat } from '@facadeur/core';

afterEach(cleanup);
type Props = ComponentProps<typeof CssDeclarationsControl>;
function setup(overrides: Partial<Props> = {}) {
  const props: Props = {
    entries: [
      { property: 'display', value: 'grid', overridden: true },
      { property: 'width', value: '100px', overridden: false },
      { property: 'padding', value: '{space.small}', overridden: true },
      { property: 'border', value: '1px solid red', overridden: true },
      { property: 'border-radius', value: '4px', overridden: true },
      { property: '--manual', value: 'kept', overridden: true },
    ],
    declarationName: (property) => `css-${property}`,
    catalogs: {
      colorTokens: [],
      shadowTokens: [],
      typographyTokens: [],
      radiusTokens: [],
      dimensionTokens: ['{space.small}', '{space.large}'],
      typographyCatalogs: {
        fontRefs: [],
        fontFamilyTokens: [],
        fontWeightTokens: [],
        dimensionTokens: [],
        numberTokens: [],
      },
    },
    onCommitDeclaration: vi.fn(),
    onPatchDeclarations: vi.fn(),
    onAddDeclaration: vi.fn(),
    ...overrides,
  };
  return { ...render(<CssDeclarationsControl {...props} />), props };
}
function manualSection() {
  return screen.getByRole('button', { name: 'Manual CSS properties' }).closest('section')!;
}
function edit(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

it('renders guided groups with undefined content and keeps every CSS row in the manual section', () => {
  const guided = vi.fn((group: string) => (
    <div data-testid={`guided-${group}`}>Guided {group}</div>
  ));
  const { props } = setup({ renderStructuredSection: guided });
  expect(guided.mock.calls).toEqual([
    ['layout', undefined],
    ['size', undefined],
    ['spacing', undefined],
  ]);
  expect(screen.getByRole('button', { name: 'Manual CSS properties' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(screen.queryByRole('button', { name: 'Add property' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Border & Radius' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Manual CSS properties' }));
  const manual = manualSection();
  for (const entry of props.entries)
    expect(manual.querySelector(`[name="css-${entry.property}"]`)).toBeTruthy();
  expect(within(manual).getByRole('button', { name: 'Add property' })).toBeInTheDocument();
  expect(within(manual).queryByText('Guided layout')).not.toBeInTheDocument();
  expect(props.onCommitDeclaration).not.toHaveBeenCalled();
  expect(props.onPatchDeclarations).not.toHaveBeenCalled();
});

it('preserves standalone manual editing, inherited ownership and reset callbacks', () => {
  const reset = vi.fn();
  const { props } = setup({
    renderAfterRow: (property, overridden) =>
      overridden ? <button onClick={() => reset(property)}>Reset {property}</button> : null,
  });
  expect(screen.getByRole('button', { name: 'Manual CSS properties' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  edit(within(manualSection()).getByRole('textbox', { name: 'Width' }), '240px');
  expect(props.onCommitDeclaration).toHaveBeenCalledExactlyOnceWith('width', '240px', false);
  fireEvent.click(within(manualSection()).getByRole('button', { name: 'Reset border' }));
  expect(reset).toHaveBeenCalledExactlyOnceWith('border');
});

it('resyncs manual border/radius values into guided controls without writes', () => {
  const { props, rerender } = setup();
  edit(within(manualSection()).getByRole('textbox', { name: 'Border' }), '2px dashed blue');
  expect(props.onCommitDeclaration).toHaveBeenCalledExactlyOnceWith(
    'border',
    '2px dashed blue',
    true,
  );
  const next = props.entries.map((entry) =>
    entry.property === 'border' ? { ...entry, value: '2px dashed blue' } : entry,
  );
  rerender(<CssDeclarationsControl {...props} entries={next} />);
  const guided = screen.getByRole('heading', { name: 'Border & Radius' }).closest('section')!;
  expect(within(guided).getByRole('textbox', { name: 'Width' })).toHaveValue('2px');
  expect(within(guided).getByRole('combobox')).toHaveValue('dashed');
  expect(props.onPatchDeclarations).not.toHaveBeenCalled();
});

it('keeps compound guided changes atomic and reflects committed values in manual rows', () => {
  const { props, rerender } = setup();
  const guided = screen.getByRole('heading', { name: 'Border & Radius' }).closest('section')!;
  edit(within(guided).getByRole('textbox', { name: 'Border radius' }), '8px');
  expect(props.onPatchDeclarations).toHaveBeenCalledExactlyOnceWith({
    borderRadius: '8px',
    'border-radius': null,
  });
  rerender(
    <CssDeclarationsControl
      {...props}
      entries={props.entries.map((entry) =>
        entry.property === 'border-radius' ? { ...entry, value: '8px' } : entry,
      )}
    />,
  );
  expect(within(manualSection()).getByRole('textbox', { name: 'Radius' })).toHaveValue('8px');
});

it('preserves token selections and keeps Add property inside the manual section', () => {
  const { props, container } = setup();
  fireEvent.click(container.querySelector('[name="css-padding"]')!);
  fireEvent.click(screen.getByRole('button', { name: /Large/ }));
  expect(props.onCommitDeclaration).toHaveBeenCalledExactlyOnceWith(
    'padding',
    '{space.large}',
    true,
  );
  fireEvent.click(within(manualSection()).getByRole('button', { name: 'Add property' }));
  fireEvent.change(screen.getByPlaceholderText('property'), { target: { value: ' opacity ' } });
  fireEvent.change(screen.getByPlaceholderText('value'), { target: { value: ' 0.5 ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add style' }));
  expect(props.onAddDeclaration).toHaveBeenCalledExactlyOnceWith('opacity', '0.5');
});

it('keeps inactive declarations disabled but resettable and rejects inactive additions', () => {
  const document = toFlat({
    version: 1,
    id: 'caps',
    name: 'Caps',
    kind: 'component',
    root: { id: 'root', type: 'text', text: 'Item' },
  });
  const caps = layoutCapabilities({ document, nodeId: 'root' });
  const reset = vi.fn();
  const { props, container } = setup({
    entries: [{ property: 'flex-direction', value: 'row', overridden: true }],
    layoutCapabilities: caps,
    renderAfterRow: (property) => <button onClick={() => reset(property)}>Reset {property}</button>,
  });
  expect(container.querySelector('[name="css-flex-direction"]')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Reset flex-direction' }));
  expect(reset).toHaveBeenCalledExactlyOnceWith('flex-direction');
  fireEvent.click(screen.getByRole('button', { name: 'Add property' }));
  fireEvent.change(screen.getByPlaceholderText('property'), {
    target: { value: 'flex-direction' },
  });
  fireEvent.change(screen.getByPlaceholderText('value'), { target: { value: 'column' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add style' }));
  expect(props.onAddDeclaration).not.toHaveBeenCalled();
});
