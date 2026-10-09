import { describe, expect, it } from 'vitest';
import type { FlatDocument, StyleBlock } from '@facadeur/core';
import {
  effectiveStyleDeclarations,
  readStyleDeclarations,
  shownDeclarations,
  variantStyleBlock,
  writeStyleDeclaration,
  writeStyleDeclarations,
} from '../src/domain/edits/style-edit';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

const document = {
  rootId: 'root',
  styles: {
    declarations: { color: 'black', padding: fixtureTokenRef(fixtureIds.tokens.space.inset.sm) },
    states: { hover: { color: 'gray' } },
    breakpoints: {
      [fixtureIds.catalog.breakpoints.tablet]: {
        declarations: { padding: fixtureTokenRef(fixtureIds.tokens.space.inset.md) },
      },
    },
    children: {
      label: {
        declarations: { fontSize: '16px' },
        breakpoints: {
          [fixtureIds.catalog.breakpoints.tablet]: { declarations: { fontSize: '18px' } },
        },
      },
    },
  },
  variantPresets: [
    {
      name: 'compact',
      overrides: {
        styles: {
          declarations: { color: 'navy' },
          states: { hover: { color: 'blue' } },
          breakpoints: {
            [fixtureIds.catalog.breakpoints.tablet]: { declarations: { padding: '16px' } },
          },
          children: {
            label: {
              declarations: { fontSize: '20px' },
              breakpoints: {
                [fixtureIds.catalog.breakpoints.tablet]: { declarations: { fontSize: '22px' } },
              },
            },
          },
        },
      },
    },
  ],
} as unknown as Pick<FlatDocument, 'rootId' | 'styles' | 'variantPresets'>;

describe('style edit layers', () => {
  it('reads and writes a sparse named variant at breakpoint, state, and child layers', () => {
    const block = variantStyleBlock(document, 'compact');
    expect(
      readStyleDeclarations(block, 'root', {
        nodeId: 'root',
        breakpointId: fixtureIds.catalog.breakpoints.tablet,
      }),
    ).toEqual({ padding: '16px' });
    expect(readStyleDeclarations(block, 'root', { nodeId: 'root', state: 'hover' })).toEqual({
      color: 'blue',
    });
    expect(
      readStyleDeclarations(block, 'root', {
        nodeId: 'label',
        breakpointId: fixtureIds.catalog.breakpoints.tablet,
      }),
    ).toEqual({ fontSize: '22px' });

    const next = writeStyleDeclaration(
      block,
      'root',
      { nodeId: 'label', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      'fontSize',
      '24px',
    );
    expect(
      next?.children?.label?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations,
    ).toEqual({ fontSize: '24px' });
    expect(next?.children?.label?.declarations).toEqual({ fontSize: '20px' });
  });

  it('resets only the named variant target layer and keeps base styles unchanged', () => {
    const block = variantStyleBlock(document, 'compact');
    const next = writeStyleDeclaration(
      block,
      'root',
      { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      'padding',
      null,
    );
    expect(next?.declarations).toEqual({ color: 'navy' });
    expect(next?.breakpoints).toBeUndefined();
    expect(
      document.styles?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations,
    ).toEqual({
      padding: fixtureTokenRef(fixtureIds.tokens.space.inset.md),
    });
  });

  it('compacts an empty sparse child and preserves sibling variant layers', () => {
    const block: StyleBlock = {
      variants: { tone: { loud: { declarations: { color: 'red' } } } },
      children: {
        label: {
          breakpoints: {
            [fixtureIds.catalog.breakpoints.tablet]: { declarations: { color: 'blue' } },
          },
        },
      },
    };
    const next = writeStyleDeclaration(
      block,
      'root',
      { nodeId: 'label', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      'color',
      null,
    );
    expect(next).toEqual({ variants: { tone: { loud: { declarations: { color: 'red' } } } } });
  });

  it('applies a compound patch as one sparse layer update', () => {
    const next = writeStyleDeclarations(
      document.styles,
      'root',
      { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet },
      { padding: null, margin: '4px' },
    );
    expect(next?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]?.declarations).toEqual({
      margin: '4px',
    });
    expect(next?.declarations?.padding).toBe(fixtureTokenRef(fixtureIds.tokens.space.inset.sm));
  });

  it('cascades preceding breakpoints and normal declarations into state values', () => {
    expect(
      effectiveStyleDeclarations(document.styles, 'root', { nodeId: 'root', state: 'hover' }, [
        { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 },
        { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
      ]),
    ).toEqual({ color: 'gray', padding: fixtureTokenRef(fixtureIds.tokens.space.inset.sm) });
    expect(
      effectiveStyleDeclarations(
        document.styles,
        'root',
        { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet, state: 'hover' },
        [
          { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 },
          { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
        ],
      ),
    ).toEqual({ color: 'gray', padding: fixtureTokenRef(fixtureIds.tokens.space.inset.md) });
  });

  it('treats camel and kebab aliases as one sparse property while preserving storage', () => {
    const base: StyleBlock = {
      declarations: { borderWidth: '1px', color: 'black', margin: '4px' },
    };
    const variant: StyleBlock = {
      declarations: { 'border-width': '2px', color: 'white', margin: '8px' },
    };

    expect(shownDeclarations(base.declarations!, variant.declarations!, true)).toEqual([
      { property: 'borderWidth', value: '2px', overridden: true },
      { property: 'color', value: 'white', overridden: true },
      { property: 'margin', value: '8px', overridden: true },
    ]);

    const changed = writeStyleDeclaration(
      variant,
      'root',
      { nodeId: 'root' },
      'borderWidth',
      '3px',
    );
    expect(changed?.declarations).toEqual({
      'border-width': '3px',
      color: 'white',
      margin: '8px',
    });
    const reset = writeStyleDeclaration(
      {
        ...changed!,
        declarations: {
          ...changed!.declarations,
          borderWidth: '3px',
        },
      },
      'root',
      { nodeId: 'root' },
      'borderWidth',
      null,
    );
    expect(reset?.declarations).toEqual({ color: 'white', margin: '8px' });
    expect(shownDeclarations(base.declarations!, reset?.declarations ?? {}, true)).toContainEqual({
      property: 'borderWidth',
      value: '1px',
      overridden: false,
    });
  });

  it('cascades alias collisions across breakpoints and keeps unrelated CSS output data', () => {
    const block: StyleBlock = {
      declarations: { borderWidth: '1px', color: 'black' },
      breakpoints: {
        [fixtureIds.catalog.breakpoints.tablet]: {
          declarations: {
            'border-width': '2px',
            margin: fixtureTokenRef(fixtureIds.tokens.space.gap.sm),
          },
        },
      },
    };
    expect(
      effectiveStyleDeclarations(
        block,
        'root',
        { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet },
        [
          { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 },
          { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
        ],
      ),
    ).toEqual({
      'border-width': '2px',
      color: 'black',
      margin: fixtureTokenRef(fixtureIds.tokens.space.gap.sm),
    });
  });

  it('resets all aliases from one state breakpoint layer without touching base', () => {
    const block: StyleBlock = {
      declarations: { borderWidth: '1px', color: 'black' },
      breakpoints: {
        [fixtureIds.catalog.breakpoints.tablet]: {
          states: {
            hover: { borderWidth: '2px', 'border-width': '3px' },
          },
        },
      },
    };
    const reset = writeStyleDeclaration(
      block,
      'root',
      { nodeId: 'root', breakpointId: fixtureIds.catalog.breakpoints.tablet, state: 'hover' },
      'border-width',
      null,
    );
    expect(reset).toEqual({ declarations: { borderWidth: '1px', color: 'black' } });
  });
});
