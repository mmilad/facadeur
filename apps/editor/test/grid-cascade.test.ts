import { expect, it } from 'vitest';
import { toFlat, type StyleBlock } from '@facadeur/core';
import type { EditorSnapshot } from '../src/domain/session';
import { gridDeclarations } from '../src/ui/sidebar/properties/layout/grid/edits';

const breakpoints = [
  { id: 'desktop', minWidth: 1200 },
  { id: 'phone', minWidth: 375 },
  { id: 'tablet', minWidth: 768 },
];

it('starts with inherited master values and lets local shorthand reset inherited axes', () => {
  const inherited = {
    rowGap: '{master.row}',
    columnGap: '{master.column}',
    color: 'blue',
    'grid-template-areas': '"master"',
  };
  const snap = snapshot({ declarations: { gap: '{local.gap}', color: 'red' } });
  expect(gridDeclarations(snap, 'root', null, breakpoints, inherited)).toEqual({
    gap: '{local.gap}',
    color: 'red',
    'grid-template-areas': '"master"',
  });
  expect(inherited).toEqual({
    rowGap: '{master.row}',
    columnGap: '{master.column}',
    color: 'blue',
    'grid-template-areas': '"master"',
  });
});

it('preserves inherited shorthand with one local axis override', () => {
  const snap = snapshot({ declarations: { 'row-gap': '{local.row}' } });
  expect(
    gridDeclarations(snap, 'root', null, breakpoints, {
      gap: '{master.row} {master.column}',
      color: 'blue',
    }),
  ).toEqual({
    gap: '{master.row} {master.column}',
    'row-gap': '{local.row}',
    color: 'blue',
  });
});

function snapshot(styles: StyleBlock, style?: Record<string, string>, child = false) {
  const activeDocument = toFlat({
    version: 1,
    id: 'grid-cascade',
    name: 'Grid cascade',
    kind: 'component',
    root: child
      ? { id: 'root', type: 'frame', children: [{ id: 'child', type: 'frame' }] }
      : { id: 'root', type: 'frame' },
  });
  // Exercise display-only imported records without changing schema spacing policy.
  activeDocument.styles = styles;
  const node = activeDocument.nodes[child ? 'child' : 'root']!;
  if (node.type !== 'instance') node.style = style;
  return { activeDocument } as EditorSnapshot;
}

it.each(['{space.gap.md}', '{space.gap.sm} {space.gap.lg}'])(
  'later shorthand neutralizes both inherited axes, preserving %s verbatim',
  (gap) => {
    const snap = snapshot({
      declarations: { 'row-gap': '{space.gap.sm}', 'column-gap': '{space.gap.lg}', color: 'red' },
      breakpoints: { tablet: { declarations: { gap } } },
    });
    const before = structuredClone(snap);
    expect(gridDeclarations(snap, 'root', 'tablet', breakpoints)).toEqual({ gap, color: 'red' });
    expect(snap).toEqual(before);
  },
);

it('cascades sorted preceding breakpoints and excludes wider layers', () => {
  const snap = snapshot({
    declarations: { gap: '{space.gap.sm}', opacity: '0.5' },
    breakpoints: {
      desktop: { declarations: { gap: '{space.gap.lg}' } },
      tablet: { declarations: { rowGap: '{space.gap.md}' } },
      phone: { declarations: { columnGap: '{space.gap.sm}' } },
    },
  });
  expect(gridDeclarations(snap, 'root', 'tablet', breakpoints)).toEqual({
    gap: '{space.gap.sm}',
    'column-gap': '{space.gap.sm}',
    'row-gap': '{space.gap.md}',
    opacity: '0.5',
  });
  expect(gridDeclarations(snap, 'root', 'desktop', breakpoints)).toEqual({
    gap: '{space.gap.lg}',
    opacity: '0.5',
  });
  expect(gridDeclarations(snap, 'root', null, breakpoints)).toEqual({
    gap: '{space.gap.sm}',
    opacity: '0.5',
  });
});

it('applies node style after style-block base and viewport after node style', () => {
  const snap = snapshot(
    {
      declarations: { gap: '{space.gap.sm}', 'row-gap': '{space.gap.lg}', color: 'red' },
      breakpoints: { tablet: { declarations: { gap: '{space.gap.lg}' } } },
    },
    { gap: '{space.gap.md}', columnGap: '{space.gap.sm}' },
  );
  expect(gridDeclarations(snap, 'root', null, breakpoints)).toEqual({
    gap: '{space.gap.md}',
    'column-gap': '{space.gap.sm}',
    color: 'red',
  });
  expect(gridDeclarations(snap, 'root', 'tablet', breakpoints)).toEqual({
    gap: '{space.gap.lg}',
    color: 'red',
  });
});

it('respects declaration order within a layer and canonicalizes aliases', () => {
  const snap = snapshot({
    declarations: {
      rowGap: '{space.gap.sm}',
      gap: '{space.gap.md}',
      columnGap: '{space.gap.lg}',
    },
  });
  expect(gridDeclarations(snap, 'root', null, breakpoints)).toEqual({
    gap: '{space.gap.md}',
    'column-gap': '{space.gap.lg}',
  });
});

it('resolves child owners without inheriting parent gaps', () => {
  const snap = snapshot(
    {
      declarations: { gap: '{parent.gap}' },
      children: {
        child: {
          declarations: { 'row-gap': '{child.row}' },
          breakpoints: { tablet: { declarations: { gap: '{child.gap}' } } },
        },
      },
    },
    undefined,
    true,
  );
  expect(gridDeclarations(snap, 'child', 'tablet', breakpoints)).toEqual({ gap: '{child.gap}' });
  expect(gridDeclarations(snap, 'child', null, breakpoints)).toEqual({ 'row-gap': '{child.row}' });
});

it('keeps unsupported manual gap text for display without parsing or normalizing', () => {
  const snap = snapshot({
    declarations: { gap: 'var(--manual-gap)', 'row-gap': 'calc(8px + 2px)' },
  });
  expect(gridDeclarations(snap, 'root', null, breakpoints)).toEqual({
    gap: 'var(--manual-gap)',
    'row-gap': 'calc(8px + 2px)',
  });
});

it('matches effectiveStyleDeclarations fallback for unknown viewport ids', () => {
  const snap = snapshot({
    breakpoints: {
      phone: { declarations: { 'row-gap': '{phone.row}' } },
      tablet: { declarations: { gap: '{tablet.gap}' } },
      custom: { declarations: { columnGap: '{custom.column}' } },
    },
  });
  expect(gridDeclarations(snap, 'root', 'custom', breakpoints)).toEqual({
    gap: '{tablet.gap}',
    'column-gap': '{custom.column}',
  });
});
