import { describe, expect, it, vi } from 'vitest';
import * as files from '../src/domain/files.js';
import { readTokenTree, type DocumentFile, validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession } from '../src/domain/session.js';

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

function session() {
  return createEditorSession({
    documents,
    design: createProjectTemplateDocument(),
    sources: { specimen: 'specimen-page.json' },
  });
}

describe('editor session', () => {
  it('opens the specimen page and filters assets by workspace', () => {
    const editor = session();
    const snap = editor.getSnapshot();
    expect(snap.openId).toBe('specimen');
    expect(snap.workspace).toBe('page');
    expect(snap.assets.map((asset) => asset.id)).toEqual(['specimen']);
    expect(snap.paintRoot).toBe(false);

    editor.setWorkspace('atom');
    const atoms = editor.getSnapshot();
    expect(atoms.workspace).toBe('atom');
    expect(atoms.openId).toBe('button');
    expect(atoms.paintRoot).toBe(true);
    expect(atoms.assets.map((asset) => asset.id)).toEqual(['button', 'link', 'input', 'textarea']);
    editor.openAsset('link', 'root');
    expect(editor.getSnapshot().selectedNodeId).toBe('root');
    expect(editor.getSnapshot().workspace).toBe('atom');

    editor.setWorkspace('page');
    expect(editor.getSnapshot().openId).toBe('specimen');
  });

  it('edits the open document through commands and undoes across stores', () => {
    const editor = session();
    editor.openAsset('specimen-section');
    editor.selectRendered('root/intro/heading');
    expect(editor.getSnapshot().selectedNodeId).toBe('heading');

    editor.execute({ type: 'setProp', nodeId: 'heading', prop: 'text', value: 'After' });
    expect(editor.getSnapshot().document.nodes.heading).toMatchObject({ text: 'After' });

    editor.executeDesign({
      type: 'setToken',
      path: 'color.accent.default',
      token: { $value: '#ff00aa' },
    });
    expect(
      readTokenTree(editor.getSnapshot().design.tokens).tokens.get('color.accent.default')?.value,
    ).toBe('#ff00aa');

    editor.undo();
    expect(
      readTokenTree(editor.getSnapshot().design.tokens).tokens.get('color.accent.default')?.value,
    ).not.toBe('#ff00aa');
    expect(editor.getSnapshot().document.nodes.heading).toMatchObject({ text: 'After' });

    editor.undo();
    expect(editor.getSnapshot().document.nodes.heading).toMatchObject({ text: 'Specimen' });
    expect(editor.getSnapshot().canUndo).toBe(false);

    editor.redo();
    expect(editor.getSnapshot().document.nodes.heading).toMatchObject({ text: 'After' });
  });

  it('rejects a page command that breaks the nesting rules', () => {
    const editor = session();
    editor.execute({
      type: 'insert',
      parentId: 'root',
      node: { id: 'stray', type: 'instance', component: 'button' },
    });
    const snap = editor.getSnapshot();
    expect(snap.notice?.tone).toBe('error');
    expect(snap.notice?.text).toMatch(/cannot contain/i);
    const root = snap.document.nodes.root;
    expect(root?.type === 'frame' && root.children).toEqual(['specimen-section']);
  });

  it('loads a document into its workspace', () => {
    const editor = session();
    const badge: DocumentFile = {
      version: 1,
      id: 'badge',
      name: 'Badge',
      kind: 'atom',
      root: { id: 'root', type: 'text', tag: 'span', text: 'New' },
    };
    editor.loadDocument(badge);
    const snap = editor.getSnapshot();
    expect(snap.openId).toBe('badge');
    expect(snap.workspace).toBe('atom');
    expect(snap.assets.map((asset) => asset.name)).toEqual([
      'Button',
      'Link',
      'Input',
      'Textarea',
      'Badge',
    ]);
    expect(editor.filenameFor('specimen')).toBe('specimen-page.json');
    expect(editor.filenameFor('badge')).toBe('badge.json');
  });

  it('tracks document and design dirty flags separately', () => {
    const editor = session();
    expect(editor.getSnapshot().documentDirty).toBe(false);
    expect(editor.getSnapshot().designDirty).toBe(false);

    editor.openAsset('specimen-section');
    editor.execute({ type: 'setProp', nodeId: 'heading', prop: 'text', value: 'After' });
    expect(editor.getSnapshot().documentDirty).toBe(true);
    expect(editor.getSnapshot().designDirty).toBe(false);

    editor.executeDesign({
      type: 'setToken',
      path: 'color.accent.default',
      token: { $value: '#112233' },
    });
    expect(editor.getSnapshot().documentDirty).toBe(true);
    expect(editor.getSnapshot().designDirty).toBe(true);

    editor.undo();
    expect(editor.getSnapshot().designDirty).toBe(false);
    expect(editor.getSnapshot().documentDirty).toBe(true);
  });

  it('clears dirty after a successful save', async () => {
    vi.spyOn(files, 'saveJsonFile').mockResolvedValue({ via: 'dev' });
    const editor = session();
    editor.openAsset('specimen-section');
    editor.execute({ type: 'setProp', nodeId: 'heading', prop: 'text', value: 'Saved text' });
    expect(editor.getSnapshot().documentDirty).toBe(true);

    await editor.saveOpenDocument();
    expect(editor.getSnapshot().documentDirty).toBe(false);

    editor.executeDesign({
      type: 'setToken',
      path: 'color.accent.default',
      token: { $value: '#445566' },
    });
    expect(editor.getSnapshot().designDirty).toBe(true);
    await editor.saveDesign();
    expect(editor.getSnapshot().designDirty).toBe(false);
    vi.restoreAllMocks();
  });

  it('marks new assets dirty until saved', () => {
    const editor = session();
    editor.loadDocument({
      version: 1,
      id: 'badge',
      name: 'Badge',
      kind: 'atom',
      root: { id: 'root', type: 'text', tag: 'span', text: 'New' },
    });
    expect(editor.getSnapshot().documentDirty).toBe(true);
  });
});
