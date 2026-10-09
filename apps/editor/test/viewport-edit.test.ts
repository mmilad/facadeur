import { describe, expect, it } from 'vitest';
import {
  defaultBreakpoints,
  readTokenTree,
  type TokenDefinition,
  type TokenTree,
} from '@facadeur/core';
import { createEditorSession } from '../src/domain/session';
import { writeStyleDeclaration } from '../src/domain/edits/style-edit';
import { withTokenBreakpoint } from '../src/domain/edits/token-edit';
import { viewportEditContext } from '../src/domain/viewport/viewport-edit';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

const documents = editorStandardCatalog();
const phoneUuid = fixtureIds.catalog.breakpoints.phone;
const tabletUuid = fixtureIds.catalog.breakpoints.tablet;
const laptopUuid = fixtureIds.catalog.breakpoints.laptop;
const desktopUuid = fixtureIds.catalog.breakpoints.desktop;
const accentUuid = fixtureIds.tokens.color.accent.default;

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

  it('tracks focus without changing the edit target or the base style', () => {
    const editor = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    expect(editor.getSnapshot().focusViewportId).toBeNull();
    expect(editor.getSnapshot().editTarget).toBe('base');
    editor.openAsset('button', 'root');
    editor.setFocusViewport(tabletUuid);
    editor.selectNode('root');
    expect(editor.getSnapshot().focusViewportId).toBe(tabletUuid);
    expect(editor.getSnapshot().editTarget).toBe('base');
    expect(editor.getSnapshot().selectedNodeId).toBe('root');

    editor.setEditTarget('viewport');
    const before = editor.getSnapshot().document;
    const style = writeStyleDeclaration(
      before.styles,
      before.rootId,
      { nodeId: before.rootId, breakpointId: tabletUuid },
      'color',
      'blue',
    );
    editor.execute({ type: 'setStyleBlock', style });
    const after = editor.getSnapshot().document;
    expect(after.styles?.declarations).toEqual(before.styles?.declarations);
    expect(after.styles?.breakpoints?.[tabletUuid]?.declarations).toMatchObject({
      paddingInline: fixtureTokenRef(fixtureIds.tokens.space.scale.step5),
      color: 'blue',
    });
    expect(after.styles?.breakpoints?.[desktopUuid]).toBeUndefined();
    const root = after.nodes.root;
    expect(root && 'style' in root ? root.style : undefined).toBeUndefined();

    editor.setEditTarget('base');
    editor.execute({ type: 'setStyle', nodeId: 'root', property: 'color', value: 'red' });
    const base = editor.getSnapshot().document;
    const styled = base.nodes.root;
    expect(styled && 'style' in styled ? styled.style : undefined).toEqual({ color: 'red' });
    expect(base.styles?.breakpoints?.[tabletUuid]?.declarations?.color).toBe('blue');
    expect(base.styles?.declarations?.color).toBe(fixtureTokenRef(testUuid36));
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
