import { describe, expect, it } from 'vitest';
import { layoutLayer } from '../src/domain/editing';
import {
  emphasizeInsertLine,
  insertModeCue,
  isInsertTool,
  placeInParent,
  refusalMessage,
  toolAllowed,
} from '../src/domain/editing';
import type { Layout } from '@facadeur/core';

describe('editing interactions', () => {
  it('places an insert line before the sibling whose center is past the pointer', () => {
    const placed = placeInParent({
      direction: 'column',
      pointer: { x: 10, y: 50 },
      parent: { left: 0, top: 0, width: 200, height: 300 },
      siblings: [
        { id: 'a', rect: { left: 0, top: 0, width: 200, height: 40 } },
        { id: 'b', rect: { left: 0, top: 80, width: 200, height: 40 } },
      ],
    });
    expect(placed.index).toBe(1);
    expect(placed.line.height).toBe(2);
    expect(placed.line.top).toBe(59);
    expect(emphasizeInsertLine(placed.line, 0.5)).toMatchObject({ height: 8, top: 56 });
  });

  it('shows the insert-mode cue only for insert tools', () => {
    expect(isInsertTool('select')).toBe(false);
    expect(isInsertTool('frame')).toBe(true);
    expect(insertModeCue('frame')).toMatch(/Layer tool/);
    expect(insertModeCue('frame')).toMatch(/Esc or V \(Select\)/);
    expect(insertModeCue('text')).toMatch(/Text tool/);
    expect(insertModeCue('image')).toMatch(/Image tool/);
  });

  it('reads base and breakpoint layout layers without changing the source', () => {
    const layout: Layout = {
      direction: 'row',
      breakpoints: { tablet: { direction: 'column' } },
    };
    expect(layoutLayer(layout, null)).toBe(layout);
    expect(layoutLayer(layout, 'tablet')).toEqual({ direction: 'column' });
    expect(layoutLayer(layout, 'missing')).toEqual({});
    expect(layout).toEqual({ direction: 'row', breakpoints: { tablet: { direction: 'column' } } });
  });

  it('applies the current nesting policy to insert tools', () => {
    expect(toolAllowed('page', 'frame')).toBe(false);
    expect(toolAllowed('page', 'text')).toBe(false);
    expect(toolAllowed('page', 'image')).toBe(false);
    expect(toolAllowed('atom', 'frame')).toBe(false);
    expect(toolAllowed('section', 'text')).toBe(true);
    expect(refusalMessage('page', 'text')).toBe('Pages can only contain sections or components.');
  });
});
