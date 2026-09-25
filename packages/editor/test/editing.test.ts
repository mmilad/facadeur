import { describe, expect, it } from 'vitest';
import { toFlat, type DocumentFile } from '@facadeur/core';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  dropParentId,
  emphasizeInsertLine,
  layerDropTarget,
  placeInParent,
  placementAllowed,
  prefersInsideFrame,
  refusalMessage,
  sameSlot,
  toolAllowed,
  writeLayoutFields,
} from '../src/editing.js';

const section = toFlat(specimenSection as DocumentFile);
const page = toFlat(specimenPage as DocumentFile);

describe('editing', () => {
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
    const emphasized = emphasizeInsertLine(placed.line, 0.5);
    expect(emphasized.height).toBe(8);
    expect(emphasized.top).toBe(56);
  });

  it('drops inside a frame at its center and beside it at the edge', () => {
    const chain = ['root', 'intro', 'heading'];
    expect(dropParentId(section, chain, null, false)).toBe('intro');
    expect(dropParentId(section, ['root', 'intro'], null, true)).toBe('intro');
    expect(dropParentId(section, ['root', 'intro'], null, false)).toBe('root');
    expect(dropParentId(section, ['root', 'intro', 'heading'], 'intro', false)).toBe('root');
    expect(
      prefersInsideFrame({ left: 0, top: 0, width: 100, height: 100 }, { x: 50, y: 50 }, false),
    ).toBe(true);
    expect(
      prefersInsideFrame({ left: 0, top: 0, width: 100, height: 100 }, { x: 2, y: 50 }, false),
    ).toBe(false);
    expect(
      prefersInsideFrame({ left: 0, top: 0, width: 64, height: 64 }, { x: 2, y: 2 }, true),
    ).toBe(true);
  });

  it('reorders a layer after removal and refuses a drop into itself', () => {
    expect(layerDropTarget(section, 'heading', 'kicker', 'before')).toEqual({
      parentId: 'intro',
      index: 0,
    });
    expect(layerDropTarget(section, 'kicker', 'lede', 'after')).toEqual({
      parentId: 'intro',
      index: 2,
    });
    expect(layerDropTarget(section, 'intro', 'heading', 'inside')).toBeNull();
    expect(sameSlot(section, 'heading', 'intro', 1)).toBe(true);
    expect(sameSlot(section, 'heading', 'intro', 0)).toBe(false);
  });

  it('writes layout fields on the base and on one breakpoint', () => {
    const base = writeLayoutFields(undefined, null, {
      direction: 'row',
      gap: '{space.4}',
      wrap: true,
    });
    expect(base).toEqual({ direction: 'row', gap: '{space.4}', wrap: true });
    const over = writeLayoutFields(base ?? undefined, 'tablet', { direction: 'column' });
    expect(over?.breakpoints?.tablet).toEqual({ direction: 'column' });
    expect(over?.direction).toBe('row');
    const cleared = writeLayoutFields(over ?? undefined, 'tablet', { direction: null });
    expect(cleared?.breakpoints).toBeUndefined();
  });

  it('lists dimension tokens and no others', () => {
    const refs = dimensionTokenRefs({
      space: { '4': { $type: 'dimension', $value: '16px' } },
      color: { ink: { $type: 'color', $value: '#111111' } },
    });
    expect(refs).toEqual(['{space.4}']);
  });

  it('lists color tokens and no others', () => {
    const refs = colorTokenRefs({
      space: { '4': { $type: 'dimension', $value: '16px' } },
      color: { ink: { $type: 'color', $value: '#111111' } },
    });
    expect(refs).toEqual(['{color.ink}']);
  });

  it('refuses placements the nesting rules do not allow', () => {
    expect(toolAllowed('page', 'frame')).toBe(false);
    expect(toolAllowed('page', 'text')).toBe(false);
    expect(toolAllowed('page', 'image')).toBe(false);
    expect(toolAllowed('atom', 'frame')).toBe(true);
    expect(toolAllowed('section', 'text')).toBe(true);
    expect(placementAllowed(page, 'root', 'frame')).toBe(false);
    expect(placementAllowed(page, 'root', 'instance', 'atom')).toBe(false);
    expect(placementAllowed(page, 'root', 'instance', 'section')).toBe(true);
    expect(placementAllowed(section, 'intro', 'instance', 'section')).toBe(false);
    expect(placementAllowed(section, 'intro', 'instance', 'atom')).toBe(true);
    expect(
      dropParentId(page, ['root', 'specimen-section'], null, false, (id) =>
        placementAllowed(page, id, 'frame'),
      ),
    ).toBeNull();
    expect(refusalMessage('page', 'text')).toBe('Pages can only contain sections.');
  });
});
