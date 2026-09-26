import { describe, expect, it } from 'vitest';
import {
  defaultBreakpoints,
  readTokenTree,
  validateCatalog,
  type TokenDefinition,
  type TokenTree,
} from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import textarea from '../../../examples/textarea.json';
import { createEditorSession } from '../src/domain/session.js';
import { writeStyleDeclaration } from '../src/domain/style-edit.js';
import { withTokenBreakpoint } from '../src/domain/token-edit.js';
import { viewportEditContext } from '../src/domain/viewport-edit.js';

const documents = validateCatalog([
  button,
  link,
  input,
  textarea,
  card,
  signIn,
  specimenSection,
  specimenPage,
]);

describe('viewport edit context', () => {
  it('keeps writes on Base until a wider viewport is the edit target', () => {
    const breakpoints = defaultBreakpoints;
    expect(
      viewportEditContext({ breakpoints, focusId: null, editTarget: 'viewport' })
        .writingBreakpointId,
    ).toBeNull();
    expect(
      viewportEditContext({ breakpoints, focusId: 'mobile', editTarget: 'viewport' })
        .writingBreakpointId,
    ).toBeNull();
    const focused = viewportEditContext({
      breakpoints,
      focusId: 'tablet',
      editTarget: 'base',
    });
    expect(focused.focus).toEqual({ id: 'tablet', minWidth: 768 });
    expect(focused.overrideViewport?.minWidth).toBe(768);
    expect(focused.writingBreakpointId).toBeNull();
    expect(
      viewportEditContext({ breakpoints, focusId: 'tablet', editTarget: 'viewport' })
        .writingBreakpointId,
    ).toBe('tablet');
    expect(
      viewportEditContext({ breakpoints, focusId: 'missing', editTarget: 'viewport' }).focus,
    ).toBeNull();
  });

  it('tracks focus without changing the edit target or the base style', () => {
    const editor = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    expect(editor.getSnapshot().focusViewportId).toBeNull();
    expect(editor.getSnapshot().editTarget).toBe('base');
    editor.openAsset('button', 'root');
    editor.setFocusViewport('tablet');
    editor.selectNode('root');
    expect(editor.getSnapshot().focusViewportId).toBe('tablet');
    expect(editor.getSnapshot().editTarget).toBe('base');
    expect(editor.getSnapshot().selectedNodeId).toBe('root');

    editor.setEditTarget('viewport');
    const before = editor.getSnapshot().document;
    const style = writeStyleDeclaration(
      before.styles,
      before.rootId,
      { nodeId: before.rootId, breakpointId: 'tablet' },
      'color',
      'blue',
    );
    editor.execute({ type: 'setStyleBlock', style });
    const after = editor.getSnapshot().document;
    expect(after.styles?.declarations).toEqual(before.styles?.declarations);
    expect(after.styles?.breakpoints?.tablet?.declarations).toMatchObject({
      paddingInline: '{space.5}',
      color: 'blue',
    });
    expect(after.styles?.breakpoints?.desktop).toBeUndefined();
    const root = after.nodes.root;
    expect(root && 'style' in root ? root.style : undefined).toBeUndefined();

    editor.setEditTarget('base');
    editor.execute({ type: 'setStyle', nodeId: 'root', property: 'color', value: 'red' });
    const base = editor.getSnapshot().document;
    const styled = base.nodes.root;
    expect(styled && 'style' in styled ? styled.style : undefined).toEqual({ color: 'red' });
    expect(base.styles?.breakpoints?.tablet?.declarations?.color).toBe('blue');
    expect(base.styles?.declarations?.color).toBe('{button.color.text}');
  });
});

function stored(token: TokenDefinition): TokenTree {
  return JSON.parse(JSON.stringify({ color: { accent: token } })) as TokenTree;
}

describe('token breakpoint edits', () => {
  it('sets one breakpoint and leaves $value and the others in place', () => {
    const tree = {
      color: {
        accent: {
          $type: 'color' as const,
          $value: '#111111',
          $extensions: {
            facadeur: {
              tier: 'semantic',
              breakpoints: { desktop: '#222222' },
            },
          },
        },
      },
    };
    const next = withTokenBreakpoint(tree, 'color.accent', 'tablet', '#333333');
    expect(next.$value).toBe('#111111');
    expect(next.$extensions).toEqual({
      facadeur: {
        tier: 'semantic',
        breakpoints: { desktop: '#222222', tablet: '#333333' },
      },
    });
    const cleared = withTokenBreakpoint(stored(next), 'color.accent', 'tablet', null);
    expect(cleared.$extensions).toEqual({
      facadeur: {
        tier: 'semantic',
        breakpoints: { desktop: '#222222' },
      },
    });
    const bare = withTokenBreakpoint(stored(cleared), 'color.accent', 'desktop', null);
    expect(bare.$value).toBe('#111111');
    expect(bare.$extensions).toEqual({ facadeur: { tier: 'semantic' } });
    expect(readTokenTree(stored(next)).tokens.get('color.accent')?.breakpoints).toEqual({
      desktop: '#222222',
      tablet: '#333333',
    });
  });
});
