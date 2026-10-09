import { expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { compileDocument } from '../src/index';
import { exampleCatalog, exampleIds as fixtureIds } from '@facadeur/examples';

const phoneBreakpointUuid = fixtureIds.catalog.breakpoints.phone;
const tabletBreakpointUuid = fixtureIds.catalog.breakpoints.tablet;
const laptopBreakpointUuid = fixtureIds.catalog.breakpoints.laptop;
const spaceTwoUuid = fixtureIds.tokens.space.scale.step2;
const spacingTokens = exampleCatalog.tokens;

it.each(['instance', 'canvas'] as const)(
  'lets desktop CSS auto override inherited tablet layout Hug (%s)',
  (address) => {
    const source: DocumentFile = {
      version: 1,
      id: 'responsive-auto',
      name: 'Responsive Auto',
      kind: 'component',
      settings: {
        breakpoints: [
          { uuid: phoneBreakpointUuid, label: 'Phone', minWidth: 375 },
          { uuid: tabletBreakpointUuid, label: 'Tablet', minWidth: 768 },
          { uuid: laptopBreakpointUuid, label: 'Laptop', minWidth: 1024 },
        ],
      },
      styles: { breakpoints: { [laptopBreakpointUuid]: { declarations: { height: 'auto' } } } },
      root: {
        id: 'root',
        type: 'frame',
        layout: {
          height: { mode: 'fixed', size: 200 },
          breakpoints: { [tabletBreakpointUuid]: { height: { mode: 'hug' } } },
        },
      },
    };
    const rules = compileDocument(source, { address, paintRoot: true });
    const heightRules = rules.filter((rule) =>
      rule.declarations.some(([property]) => property === 'height'),
    );
    expect(
      heightRules.map((rule) => ({
        width: rule.minWidth,
        height: rule.declarations.find(([property]) => property === 'height')?.[1],
      })),
    ).toEqual([
      { width: undefined, height: '200px' },
      { width: 768, height: 'fit-content' },
      { width: 1024, height: 'auto' },
    ]);
    const activeHeight = (viewport: number) => {
      let height: string | undefined;
      for (const rule of heightRules) {
        if (rule.minWidth !== undefined && rule.minWidth > viewport) continue;
        for (const [property, value] of rule.declarations) {
          if (property === 'height') height = value;
        }
      }
      return height;
    };
    expect(activeHeight(375)).toBe('200px');
    expect(activeHeight(768)).toBe('fit-content');
    expect(activeHeight(1024)).toBe('auto');
  },
);

it('retains style-before-layout precedence for rules at the same width', () => {
  const source: DocumentFile = {
    version: 1,
    id: 'same-width',
    name: 'Same width',
    kind: 'component',
    settings: {
      breakpoints: [
        { uuid: phoneBreakpointUuid, label: 'Phone', minWidth: 375 },
        { uuid: tabletBreakpointUuid, label: 'Tablet', minWidth: 768 },
      ],
    },
    styles: { breakpoints: { [tabletBreakpointUuid]: { declarations: { height: 'auto' } } } },
    root: {
      id: 'root',
      type: 'frame',
      layout: { breakpoints: { [tabletBreakpointUuid]: { height: { mode: 'hug' } } } },
    },
  };
  const heights = compileDocument(source)
    .filter((rule) => rule.minWidth === 768)
    .flatMap((rule) =>
      rule.declarations.filter(([property]) => property === 'height').map(([, value]) => value),
    );
  expect(heights).toEqual(['auto', 'fit-content']);
});

it.each(['row', 'column'] as const)(
  'emits explicit auto width and height with min/max in a %s parent',
  (direction) => {
    const source: DocumentFile = {
      version: 1,
      id: 'auto-size',
      name: 'Auto size',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        layout: { direction },
        children: [
          {
            id: 'child',
            type: 'text',
            text: 'Child',
            layout: {
              width: { mode: 'auto', min: 20, max: { unit: '%', value: 90 } },
              height: { mode: 'auto', min: `{token:${spaceTwoUuid}}`, max: 300 },
            },
          },
        ],
      },
    };
    const declarations = compileDocument(source, { globalTokens: spacingTokens }).find((rule) =>
      rule.selector.includes('[data-node="child"]'),
    )?.declarations;
    expect(declarations).toEqual(
      expect.arrayContaining([
        ['width', 'auto'],
        ['height', 'auto'],
        ['min-width', '20px'],
        ['max-width', '90%'],
        ['min-height', 'var(--space-2)'],
        ['max-height', '300px'],
      ]),
    );
    expect(declarations?.some(([name]) => name === 'flex' || name === 'align-self')).toBe(false);
  },
);

it('emits height auto at a breakpoint while leaving omitted base sizing undeclared', () => {
  const source: DocumentFile = {
    version: 1,
    id: 'auto-size',
    name: 'Auto size',
    kind: 'component',
    settings: {
      breakpoints: [
        { uuid: phoneBreakpointUuid, label: 'Phone', minWidth: 375 },
        { uuid: tabletBreakpointUuid, label: 'Tablet', minWidth: 768 },
      ],
    },
    root: {
      id: 'root',
      type: 'frame',
      layout: {
        breakpoints: { [tabletBreakpointUuid]: { height: { mode: 'auto', min: 40, max: 200 } } },
      },
    },
  };
  const rules = compileDocument(source);
  const base = rules
    .filter((rule) => rule.minWidth === undefined)
    .flatMap((rule) => rule.declarations);
  expect(base.some(([name]) => name === 'height' || name === 'width')).toBe(false);
  expect(rules.find((rule) => rule.minWidth === 768)?.declarations).toEqual(
    expect.arrayContaining([
      ['height', 'auto'],
      ['min-height', '40px'],
      ['max-height', '200px'],
    ]),
  );
});
