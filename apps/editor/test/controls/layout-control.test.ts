import { describe, expect, it } from 'vitest';
import { axisModePatch } from '../../src/ui/controls/layout/axis-size-editor.js';
import { boxWith } from '../../src/ui/controls/layout/spacing-field.js';
import {
  alignLayoutPatch,
  directionPatch,
  freePositionPatch,
  justifyLayoutPatch,
  layoutControlValue,
  wrapLayoutPatch,
} from '../../src/ui/controls/layout/value.js';

describe('layout control value', () => {
  it('merges base layout when editing a breakpoint', () => {
    const value = layoutControlValue({
      nodeType: 'frame',
      layout: {
        direction: 'row',
        gap: '{space.2}',
        breakpoints: { tablet: { direction: 'column' } },
      },
      writingBreakpointId: 'tablet',
    });
    expect(value.direction).toBe('column');
    expect(value.gap).toBe('{space.2}');
    expect(value.isFrame).toBe(true);
  });

  it('defaults position to auto', () => {
    const value = layoutControlValue({
      nodeType: 'text',
      layout: undefined,
      writingBreakpointId: null,
    });
    expect(value.position).toBe('auto');
    expect(value.isFrame).toBe(false);
  });
});

describe('layout control patches', () => {
  it('clears direction when default is chosen', () => {
    expect(directionPatch('')).toEqual({ direction: null });
    expect(directionPatch('row')).toEqual({ direction: 'row' });
  });

  it('maps justify and align enums', () => {
    expect(justifyLayoutPatch('center')).toEqual({ justify: 'center' });
    expect(justifyLayoutPatch('')).toEqual({ justify: null });
    expect(alignLayoutPatch('stretch')).toEqual({ align: 'stretch' });
  });

  it('uses breakpoint-aware wrap and position clears', () => {
    expect(wrapLayoutPatch(true, 'tablet')).toEqual({ wrap: true });
    expect(wrapLayoutPatch(false, null)).toEqual({ wrap: null });
    expect(wrapLayoutPatch(false, 'tablet')).toEqual({ wrap: false });
    expect(freePositionPatch(false, null)).toEqual({ position: null, x: null, y: null });
    expect(freePositionPatch(false, 'tablet')).toEqual({ position: 'auto', x: null, y: null });
  });
});

describe('axisModePatch', () => {
  it('preserves min/max when switching to fixed', () => {
    expect(axisModePatch('fixed', { mode: 'hug', min: 10, max: { unit: '%', value: 50 } })).toEqual(
      {
        mode: 'fixed',
        size: 100,
        min: 10,
        max: { unit: '%', value: 50 },
      },
    );
  });
});

describe('boxWith', () => {
  it('drops empty sides to null', () => {
    expect(boxWith({ top: '{space.1}' }, 'top', null)).toBeNull();
    expect(boxWith({ top: '{space.1}', left: '{space.2}' }, 'top', null)).toEqual({
      left: '{space.2}',
    });
  });
});
