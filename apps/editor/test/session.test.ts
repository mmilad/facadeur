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

const variantComponent: DocumentFile = {
  version: 1,
  id: 'variant-component',
  name: 'Variant component',
  kind: 'component',
  fields: [{ name: 'label', type: 'text', default: 'Base' }],
  variants: [{ name: 'default' }, { name: 'compact', overrides: { fields: { label: 'Compact' } } }],
  styles: {
    declarations: { color: 'black' },
    variants: { variant: { compact: { declarations: { color: 'navy' } } } },
  },
  root: {
    id: 'root',
    type: 'text',
    tag: 'span',
    bindings: [{ field: 'label', target: 'text' }],
  },
};

const documents = validateCatalog([
  button,
  link,
  input,
  textarea,
  card,
  signIn,
  specimenSection,
  specimenPage,
  variantComponent,
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
    expect(atoms.assets.map((asset) => asset.id)).toEqual(['button', 'link']);
    editor.openAsset('link', 'root');
    expect(editor.getSnapshot().selectedNodeId).toBe('root');
    expect(editor.getSnapshot().workspace).toBe('atom');

    editor.setWorkspace('page');
    expect(editor.getSnapshot().openId).toBe('specimen');
  });

  it('tracks the active named variant as session state without changing the source document', () => {
    const editor = session();
    editor.openAsset('variant-component', 'root');

    expect(editor.getSnapshot().activeVariantName).toBeNull();
    expect(editor.getSnapshot().document.fields[0]?.default).toBe('Base');

    editor.setActiveVariant('compact');
    expect(editor.getSnapshot().activeVariantName).toBe('compact');
    expect(editor.getSnapshot().document.fields[0]?.default).toBe('Base');
    expect(editor.getSnapshot().documentDirty).toBe(false);

    editor.setActiveVariant('default');
    expect(editor.getSnapshot().activeVariantName).toBeNull();
    editor.setActiveVariant('missing');
    expect(editor.getSnapshot().activeVariantName).toBeNull();
    expect(editor.getSnapshot().notice?.text).toMatch(/unknown variant/i);
  });

  it('persists edits made in the active variant as sparse overrides', () => {
    const editor = session();
    editor.openAsset('variant-component', 'root');
    editor.setActiveVariant('compact');

    editor.execute({ type: 'setProp', nodeId: 'root', prop: 'text', value: 'Compact text' });

    const source = editor.getSnapshot().document;
    expect(source.nodes.root).not.toHaveProperty('text');

    const variant = editor.boardDocuments().find((document) => document.id === 'variant-component');
    expect(variant?.variants).toEqual([
      { name: 'default' },
      {
        name: 'compact',
        overrides: {
          fields: { label: 'Compact' },
          nodes: { root: { text: 'Compact text' } },
        },
      },
    ]);
    expect(editor.getSnapshot().documentDirty).toBe(true);
    expect(editor.getSnapshot().canUndo).toBe(true);

    editor.undo();
    expect(
      editor.boardDocuments().find((document) => document.id === 'variant-component')?.variants,
    ).toEqual([
      { name: 'default' },
      { name: 'compact', overrides: { fields: { label: 'Compact' } } },
    ]);
  });

  it('keeps sparse variant style layers intact while editing the active variant', () => {
    const editor = session();
    editor.openAsset('variant-component', 'root');
    editor.setActiveVariant('compact');

    expect(editor.getSnapshot().activeDocument.styles).toEqual({
      declarations: { color: 'black' },
      variants: { variant: { compact: { declarations: { color: 'navy' } } } },
    });

    const editedStyles = structuredClone(editor.getSnapshot().activeDocument.styles!);
    editedStyles.variants!.variant!.compact!.declarations!.background = 'white';
    editor.execute({ type: 'setStyleBlock', style: editedStyles });

    const unchanged = editor
      .boardDocuments()
      .find((document) => document.id === 'variant-component');
    expect(unchanged?.styles?.variants?.variant?.compact?.declarations).toEqual({
      color: 'navy',
      background: 'white',
    });

    editor.execute({ type: 'setStyle', nodeId: 'root', property: 'fontWeight', value: '700' });

    const source = editor
      .boardDocuments()
      .find((document) => document.id === 'variant-component');
    expect(source?.styles?.variants?.variant?.compact?.declarations).toEqual({
      color: 'navy',
      background: 'white',
    });
    expect(source?.root.type === 'instance' ? undefined : source?.root.style).toBeUndefined();
    expect(source?.variants?.[1]).toMatchObject({
      name: 'compact',
      overrides: { nodes: { root: { style: { fontWeight: '700' } } } },
    });
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
    expect(snap.assets.map((asset) => asset.name)).toEqual(['Button', 'Link', 'Badge']);
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

  it('blocks saving an unresolved expose contract', async () => {
    const save = vi.spyOn(files, 'saveJsonFile');
    const editor = session();
    editor.openAsset('card', 'root');
    editor.execute({
      type: 'setExpose',
      expose: { fields: { missing: 'unknown-child.value' } },
    });

    const ok = await editor.saveOpenDocument();

    expect(ok).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(editor.getSnapshot().notice?.text).toMatch(/Expose path|does not resolve/i);
    save.mockRestore();
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
