import { describe, expect, it } from 'vitest';
import { toFlat, type DesignTokenSet, type DocumentFile } from '@facadeur/core';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  shadowTokenRefs,
  typographyTokenRefs,
  dropParentId,
  emphasizeInsertLine,
  layerDropTarget,
  placeInParent,
  placementAllowed,
  prefersInsideFrame,
  refusalMessage,
  sameSlot,
  insertModeCue,
  isInsertTool,
  toolAllowed,
  writeLayoutFields,
} from '../src/domain/editing';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

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
      gap: fixtureTokenRef(fixtureIds.tokens.space.scale.step4),
      wrap: true,
    });
    expect(base).toEqual({
      direction: 'row',
      gap: fixtureTokenRef(fixtureIds.tokens.space.scale.step4),
      wrap: true,
    });
    const over = writeLayoutFields(base ?? undefined, fixtureIds.catalog.breakpoints.tablet, {
      direction: 'column',
    });
    expect(over?.breakpoints?.[fixtureIds.catalog.breakpoints.tablet]).toEqual({
      direction: 'column',
    });
    expect(over?.direction).toBe('row');
    const cleared = writeLayoutFields(over ?? undefined, fixtureIds.catalog.breakpoints.tablet, {
      direction: null,
    });
    expect(cleared?.breakpoints).toBeUndefined();
  });

  it('lists dimension tokens and no others', () => {
    const spaceUuid = fixtureIds.tokens.space.scale.step4;
    const colorUuid = testUuid22;
    const refs = dimensionTokenRefs({
      space: {
        [spaceUuid]: {
          uuid: spaceUuid,
          label: '4',
          group: '',
          valueType: 'dimension',
          value: '16px',
        },
      },
      color: {
        [colorUuid]: {
          uuid: colorUuid,
          label: 'Ink',
          group: '',
          valueType: 'color',
          value: '#111111',
        },
      },
    });
    expect(refs).toEqual([`{token:${spaceUuid}}`]);
  });

  it('lists color tokens and no others', () => {
    const spaceUuid = fixtureIds.tokens.space.scale.step4;
    const colorUuid = testUuid22;
    const refs = colorTokenRefs({
      space: {
        [spaceUuid]: {
          uuid: spaceUuid,
          label: '4',
          group: '',
          valueType: 'dimension',
          value: '16px',
        },
      },
      color: {
        [colorUuid]: {
          uuid: colorUuid,
          label: 'Ink',
          group: '',
          valueType: 'color',
          value: '#111111',
        },
      },
    });
    expect(refs).toEqual([`{token:${colorUuid}}`]);
  });

  it('lists typed token refs for editors', () => {
    const spaceUuid = fixtureIds.tokens.space.scale.step4;
    const colorUuid = testUuid22;
    const fontUuid = fixtureIds.tokens.font.inter;
    const shadowUuid = fixtureIds.tokens.shadow.md;
    const shadowLargeUuid = fixtureIds.tokens.shadow.lg;
    const bodyUuid = fixtureIds.tokens.type.body;
    const boldUuid = testUuid23;
    const ratioUuid = testUuid24;
    const tree: DesignTokenSet = {
      space: {
        [spaceUuid]: {
          uuid: spaceUuid,
          label: '4',
          group: '',
          valueType: 'dimension',
          value: '16px',
        },
      },
      color: {
        [colorUuid]: {
          uuid: colorUuid,
          label: 'Ink',
          group: '',
          valueType: 'color',
          value: '#111111',
        },
      },
      font: {
        [fontUuid]: {
          uuid: fontUuid,
          label: 'Sans',
          group: '',
          valueType: 'fontFamily',
          value: {
            family: 'Inter',
            weights: [400],
            fallbacks: ['sans-serif'],
            source: { type: 'google', family: 'Inter' },
          },
        },
      },
      shadow: {
        [shadowUuid]: {
          uuid: shadowUuid,
          label: 'Md',
          group: '',
          valueType: 'shadow',
          value: `{token:${shadowLargeUuid}}`,
        },
        [shadowLargeUuid]: {
          uuid: shadowLargeUuid,
          label: 'Lg',
          group: '',
          valueType: 'shadow',
          value: {
            offsetX: '0px',
            offsetY: '8px',
            blur: '24px',
            spread: '0px',
            color: '#000000',
          },
        },
      },
      type: {
        [bodyUuid]: {
          uuid: bodyUuid,
          label: 'Body',
          group: '',
          valueType: 'typography',
          value: {
            fontFamily: `{token:${fontUuid}}`,
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: 1.5,
          },
        },
        [boldUuid]: {
          uuid: boldUuid,
          label: 'Bold',
          group: 'weight',
          valueType: 'fontWeight',
          value: 700,
        },
        [ratioUuid]: {
          uuid: ratioUuid,
          label: 'Tight',
          group: 'ratio',
          valueType: 'number',
          value: 1.25,
        },
      },
      radius: {},
    };
    expect(typographyTokenRefs(tree)).toEqual([`{token:${bodyUuid}}`]);
    expect(shadowTokenRefs(tree)).toEqual([`{token:${shadowUuid}}`, `{token:${shadowLargeUuid}}`]);
    expect(fontFamilyTokenRefs(tree)).toEqual([`{token:${fontUuid}}`]);
    expect(fontWeightTokenRefs(tree)).toEqual([`{token:${boldUuid}}`]);
    expect(numberTokenRefs(tree)).toEqual([`{token:${ratioUuid}}`]);
  });

  it('describes insert mode for frame, text, and image tools', () => {
    expect(isInsertTool('select')).toBe(false);
    expect(isInsertTool('frame')).toBe(true);
    expect(insertModeCue('frame')).toMatch(/Frame tool/);
    expect(insertModeCue('frame')).toMatch(/Esc or V \(Select\)/);
    expect(insertModeCue('text')).toMatch(/Text tool/);
    expect(insertModeCue('image')).toMatch(/Image tool/);
  });

  it('refuses placements the nesting rules do not allow', () => {
    expect(toolAllowed('page', 'frame')).toBe(false);
    expect(toolAllowed('page', 'text')).toBe(false);
    expect(toolAllowed('page', 'image')).toBe(false);
    expect(toolAllowed('atom', 'frame')).toBe(false);
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
    expect(refusalMessage('page', 'text')).toBe('Pages can only contain sections or components.');
  });
});
