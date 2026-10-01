import { describe, expect, it, vi } from 'vitest';
import * as files from '../src/domain/assets/files.js';
import {
  readTokenTree,
  resolvePreviewData,
  type DocumentFile,
  validateCatalog,
} from '@facadeur/core';
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

const inheritedVariantComponent: DocumentFile = {
  ...variantComponent,
  id: 'inherited-variant-component',
  name: 'Inherited variant component',
  variants: [{ name: 'default' }, { name: 'compact' }],
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

function session(extraDocuments: readonly DocumentFile[] = []) {
  return createEditorSession({
    documents: [...documents, ...extraDocuments],
    design: createProjectTemplateDocument(),
    sources: { specimen: 'specimen-page.json' },
  });
}

describe('editor session', () => {
  it('reports near-100 zoom accurately and resets using the actual scale', () => {
    const editor = session();
    const zoom = vi.fn();
    editor.setZoomByHandler(zoom);
    editor.setZoom(0.9972149);
    expect(editor.getSnapshot().zoomLabel).toBe('99.72%');
    editor.resetZoom();
    expect(zoom).toHaveBeenLastCalledWith(1 / 0.9972149);
    editor.setZoom(1);
    expect(editor.getSnapshot().zoomLabel).toBe('100%');
    editor.destroy();
  });
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
    expect(editor.getSnapshot().document.fields[0]?.default).toBeUndefined();
    expect(editor.getSnapshot().document.previewData?.fields?.label).toBe('Base');

    editor.setActiveVariant('compact');
    expect(editor.getSnapshot().activeVariantName).toBe('compact');
    expect(editor.getSnapshot().document.fields[0]?.default).toBeUndefined();
    expect(editor.getSnapshot().document.previewData?.fields?.label).toBe('Base');
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
          nodes: { root: { text: 'Compact text' } },
          styles: { declarations: { color: 'navy' } },
        },
      },
    ]);
    expect(editor.getSnapshot().documentDirty).toBe(true);
    expect(editor.getSnapshot().canUndo).toBe(true);

    editor.undo();
    expect(
      editor.boardDocuments().find((document) => document.id === 'variant-component')?.variants,
    ).toEqual([{ name: 'default' }, { name: 'compact' }]);
  });

  it('flows base preview changes through inherited variants and restores overrides with undo', () => {
    const editor = session([inheritedVariantComponent]);
    editor.openAsset('inherited-variant-component', 'root');
    editor.setActiveVariant('compact');

    editor.execute({ type: 'setPreviewData', previewData: { fields: { label: 'Changed base' } } });
    expect(resolvePreviewData(editor.getSnapshot().document, 'compact').label).toBe('Changed base');

    editor.execute({
      type: 'setPreviewData',
      previewData: {
        fields: { label: 'Changed base' },
        variants: { compact: { label: 'Local override' } },
      },
    });
    expect(resolvePreviewData(editor.getSnapshot().document, 'compact').label).toBe(
      'Local override',
    );

    editor.execute({
      type: 'setPreviewData',
      previewData: {
        fields: { label: 'Newest base' },
        variants: { compact: { label: 'Local override' } },
      },
    });
    expect(resolvePreviewData(editor.getSnapshot().document, 'compact').label).toBe(
      'Local override',
    );

    editor.execute({ type: 'setPreviewData', previewData: { fields: { label: 'Newest base' } } });
    expect(resolvePreviewData(editor.getSnapshot().document, 'compact').label).toBe('Newest base');

    editor.undo();
    expect(resolvePreviewData(editor.getSnapshot().document, 'compact').label).toBe(
      'Local override',
    );
    editor.undo();
    expect(resolvePreviewData(editor.getSnapshot().document, 'compact').label).toBe(
      'Local override',
    );
  });

  it('migrates legacy variant styles when editing the active variant', () => {
    const editor = session();
    editor.openAsset('variant-component', 'root');
    editor.setActiveVariant('compact');

    expect(editor.getSnapshot().activeDocument.styles).toEqual({
      declarations: { color: 'black' },
      variants: { variant: { compact: { declarations: { color: 'navy' } } } },
    });

    editor.execute({
      type: 'setVariantStyleBlock',
      name: 'compact',
      style: { declarations: { color: 'navy', background: 'white' } },
    });

    const migrated = editor
      .boardDocuments()
      .find((document) => document.id === 'variant-component');
    expect(migrated?.styles?.variants?.variant?.compact).toBeUndefined();
    expect(migrated?.variants?.[1]).toMatchObject({
      name: 'compact',
      overrides: { styles: { declarations: { color: 'navy', background: 'white' } } },
    });

    editor.execute({ type: 'setStyle', nodeId: 'root', property: 'fontWeight', value: '700' });

    const source = editor.boardDocuments().find((document) => document.id === 'variant-component');
    expect(source?.styles?.variants?.variant?.compact).toBeUndefined();
    expect(source?.root.type === 'instance' ? undefined : source?.root.style).toBeUndefined();
    expect(source?.variants?.[1]).toMatchObject({
      name: 'compact',
      overrides: {
        nodes: { root: { style: { fontWeight: '700' } } },
        styles: { declarations: { color: 'navy', background: 'white' } },
      },
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

  it('migrates loaded defaults into preview metadata without marking the document dirty', async () => {
    vi.spyOn(files, 'saveJsonFile').mockResolvedValue({ via: 'dev' });
    const editor = session();
    editor.loadDocument({
      ...variantComponent,
      fields: [{ name: 'label', type: 'text', default: 'Reloaded' }],
      variants: [
        { name: 'default' },
        { name: 'compact', overrides: { fields: { label: 'Small' } } },
      ],
    });

    const loaded = editor.getSnapshot().document;
    expect(loaded.fields[0]?.default).toBeUndefined();
    expect(loaded.previewData).toEqual({
      fields: { label: 'Reloaded' },
      variants: { compact: { label: 'Small' } },
    });
    expect(editor.getSnapshot().documentDirty).toBe(false);

    editor.execute({ type: 'setPreviewData', previewData: { fields: { label: 'Edited' } } });
    expect(editor.getSnapshot().documentDirty).toBe(true);
    await editor.saveOpenDocument();
    expect(editor.getSnapshot().documentDirty).toBe(false);
    vi.restoreAllMocks();
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
