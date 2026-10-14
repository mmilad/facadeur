import { describe, expect, it } from 'vitest';
import {
  defaultBreakpoints,
  readTokenTree,
  type TokenDefinition,
  type TokenTree,
} from '@facadeur/core';
import { withTokenBreakpoint } from '../src/domain/edits/token-edit';
import { viewportEditContext } from '../src/domain/viewport/viewport-edit';
import { exampleIds } from '@facadeur/examples';

const phoneUuid = exampleIds.catalog.breakpoints.phone;
const tabletUuid = exampleIds.catalog.breakpoints.tablet;
const desktopUuid = exampleIds.catalog.breakpoints.desktop;
const accentUuid = exampleIds.tokens.color.accent.default;

describe('viewport edit context', () => {
  it('keeps writes on Base until a wider viewport is the edit target', () => {
    const breakpoints = defaultBreakpoints;
    expect(
      viewportEditContext({ breakpoints, focusId: null, editTarget: 'viewport' })
        .writingBreakpointId,
    ).toBeNull();
    expect(
      viewportEditContext({ breakpoints, focusId: phoneUuid, editTarget: 'viewport' })
        .writingBreakpointId,
    ).toBeNull();
    const focused = viewportEditContext({
      breakpoints,
      focusId: tabletUuid,
      editTarget: 'base',
    });
    expect(focused.focus).toEqual({ uuid: tabletUuid, label: 'Tablet', minWidth: 768 });
    expect(focused.overrideViewport?.minWidth).toBe(768);
    expect(focused.writingBreakpointId).toBeNull();
    expect(
      viewportEditContext({ breakpoints, focusId: tabletUuid, editTarget: 'viewport' })
        .writingBreakpointId,
    ).toBe(tabletUuid);
    expect(
      viewportEditContext({ breakpoints, focusId: 'missing', editTarget: 'viewport' }).focus,
    ).toBeNull();
  });
});

function stored(token: TokenDefinition): TokenTree {
  return JSON.parse(
    JSON.stringify({
      color: { [accentUuid]: token },
      space: {},
      radius: {},
      shadow: {},
      type: {},
      font: {},
    }),
  ) as TokenTree;
}

describe('token breakpoint edits', () => {
  it('sets one breakpoint and leaves $value and the others in place', () => {
    const tree = stored({
      uuid: accentUuid,
      label: 'Default',
      group: 'accent',
      valueType: 'color',
      value: '#111111',
      extensions: { tier: 'semantic' },
      breakpoints: { [desktopUuid]: '#222222' },
    });
    const next = withTokenBreakpoint(tree, 'color', accentUuid, tabletUuid, '#333333');
    expect(next.value).toBe('#111111');
    expect(next.extensions).toEqual({ tier: 'semantic' });
    expect(next.breakpoints).toEqual({ [desktopUuid]: '#222222', [tabletUuid]: '#333333' });

    const cleared = withTokenBreakpoint(stored(next), 'color', accentUuid, tabletUuid, null);
    expect(cleared.breakpoints).toEqual({ [desktopUuid]: '#222222' });
    const bare = withTokenBreakpoint(stored(cleared), 'color', accentUuid, desktopUuid, null);
    expect(bare.value).toBe('#111111');
    expect(bare.extensions).toEqual({ tier: 'semantic' });
    expect(readTokenTree(stored(next)).tokens.get(accentUuid)?.breakpoints).toEqual({
      [desktopUuid]: '#222222',
      [tabletUuid]: '#333333',
    });
  });
});
