import { expect, it } from 'vitest';
import { canonicalizeLayout, parseLayout, type AxisSize, type Layout } from '../src/index';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

const phoneBreakpointUuid = fixtureIds.catalog.breakpoints.phone;
const tabletBreakpointUuid = fixtureIds.catalog.breakpoints.tablet;

it('canonicalizes explicit auto dimensions and sparse breakpoint constraints', () => {
  const source: Layout = {
    width: { mode: 'auto', min: 10, max: { unit: '%', value: 90 } },
    height: { mode: 'auto', min: 20, max: 300 },
    breakpoints: {
      [tabletBreakpointUuid]: { height: { mode: 'auto' } },
      [phoneBreakpointUuid]: { width: { mode: 'fill' } },
    },
  };
  const canonical = parseLayout(source);

  expect(canonical).toEqual({
    ...source,
    breakpoints: {
      [phoneBreakpointUuid]: { width: { mode: 'fill' } },
      [tabletBreakpointUuid]: { height: { mode: 'auto' } },
    },
  });
  expect(Object.keys(canonical.breakpoints ?? {})).toEqual(
    [phoneBreakpointUuid, tabletBreakpointUuid].sort(),
  );
  expect(canonicalizeLayout(source)).toEqual(canonical);
});

it('preserves auto min/max tokens in the layout parser', () => {
  const reference = fixtureTokenRef(fixtureIds.tokens.space.scale.step2);
  expect(parseLayout({ height: { mode: 'auto', min: reference, max: reference } })).toEqual({
    height: { mode: 'auto', min: reference, max: reference },
  });
});

it.each<AxisSize>([{ mode: 'hug' }, { mode: 'fill' }, { mode: 'fixed', size: 100 }])(
  'accepts axis mode $mode',
  (axis: AxisSize) => {
    expect(parseLayout({ width: axis })).toEqual({ width: axis });
  },
);

it('retains size validation and rejects a fixed size on auto', () => {
  expect(() => parseLayout({ width: { mode: 'auto', size: 100 } })).toThrow(/auto cannot set size/);
  expect(() => parseLayout({ height: { mode: 'auto', min: 0 } })).toThrow(/positive number/);
  expect(() => parseLayout({ width: { mode: 'fixed' } })).toThrow(/needs a size/);
  expect(parseLayout({ margin: { top: 'auto' } })).toEqual({ margin: { top: 'auto' } });
  expect(parseLayout({ margin: 'auto' })).toEqual({ margin: 'auto' });
  expect(() => parseLayout({ margin: { top: '16px' } })).toThrow(/token reference/);
  expect(() => parseLayout({ padding: { top: 'auto' } })).toThrow(/token reference/);
});
