import { expect, it } from 'vitest';
import {
  canonicalizeLayout,
  parseLayout,
  toFlat,
  toNested,
  validateCatalog,
  type AxisSize,
  type DocumentFile,
} from '../src/index';

it('validates and round-trips explicit auto dimensions and sparse breakpoint constraints', () => {
  const source: DocumentFile = {
    version: 1,
    id: 'auto-size',
    name: 'Auto size',
    kind: 'component',
    settings: {
      breakpoints: [
        { id: 'phone', minWidth: 375 },
        { id: 'tablet', minWidth: 768 },
      ],
    },
    root: {
      id: 'root',
      type: 'frame',
      layout: {
        width: { mode: 'auto', min: 10, max: { unit: '%', value: 90 } },
        height: { mode: 'auto', min: 20, max: 300 },
        breakpoints: { tablet: { height: { mode: 'auto' } } },
      },
    },
  };
  const [validated] = validateCatalog([source]);
  expect(validated?.root.layout).toEqual(source.root.layout);
  expect(toNested(toFlat(validated!))).toEqual(validated);
  expect(canonicalizeLayout(source.root.layout)).toEqual(source.root.layout);
});

it('preserves auto min/max tokens in the layout parser', () => {
  expect(parseLayout({ height: { mode: 'auto', min: '{space.2}', max: '{space.8}' } })).toEqual({
    height: { mode: 'auto', min: '{space.2}', max: '{space.8}' },
  });
});

it.each<AxisSize>([{ mode: 'hug' }, { mode: 'fill' }, { mode: 'fixed', size: 100 }])(
  'retains legacy axis mode $mode',
  (axis: AxisSize) => {
    expect(parseLayout({ width: axis })).toEqual({ width: axis });
  },
);

it('retains size validation and rejects a fixed size on auto', () => {
  expect(() => parseLayout({ width: { mode: 'auto', size: 100 } })).toThrow(/auto cannot set size/);
  expect(() => parseLayout({ height: { mode: 'auto', min: 0 } })).toThrow(/positive number/);
  expect(() => parseLayout({ width: { mode: 'fixed' } })).toThrow(/needs a size/);
});
