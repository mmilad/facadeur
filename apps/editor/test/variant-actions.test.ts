import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { createNamedVariant, renameNamedVariant } from '../src/domain/variant-actions.js';

const file: DocumentFile = {
  version: 1,
  id: 'input',
  name: 'Input',
  kind: 'atom',
  root: { id: 'root', type: 'text', text: 'Base' },
};
function session() {
  return createEditorSession({ documents: [file], design: createProjectTemplateDocument() });
}

describe('shared variant actions', () => {
  it('creates and activates a variant with both labels in one undo step', () => {
    const editor = session();
    const before = editor.getSnapshot().document;
    expect(createNamedVariant(editor)).toBe('variant-1');
    expect(editor.getSnapshot().activeVariantName).toBe('variant-1');
    expect(editor.getSnapshot().document.variantLabels).toEqual({
      default: 'Default',
      'variant-1': 'Variante 1',
    });
    editor.undo();
    expect(editor.getSnapshot().document).toEqual(before);
    expect(editor.getSnapshot().canUndo).toBe(false);
    expect(editor.getSnapshot().activeVariantName).toBeNull();
    editor.redo();
    expect(editor.getSnapshot().document.variantLabels).toEqual({
      default: 'Default',
      'variant-1': 'Variante 1',
    });
  });

  it('preserves a renamed base and stable ids when another variant is created', () => {
    const editor = session();
    renameNamedVariant(editor, 'default', 'Text Input');
    createNamedVariant(editor, '  Dark Mode  ');
    renameNamedVariant(editor, 'variant-1', 'Dark Theme');
    createNamedVariant(editor);
    expect(editor.getSnapshot().document.variantLabels).toEqual({
      default: 'Text Input',
      'variant-1': 'Dark Theme',
      'variant-2': 'Variante 2',
    });
    expect(editor.getSnapshot().document.variantPresets?.map((preset) => preset.name)).toEqual([
      'variant-1',
      'variant-2',
    ]);
  });

  it('does not persist or activate a variant with a blank label', () => {
    const editor = session();
    const before = editor.getSnapshot().document;
    expect(createNamedVariant(editor, '  ')).toBeNull();
    expect(editor.getSnapshot().document).toEqual(before);
    expect(editor.getSnapshot().activeVariantName).toBeNull();
    expect(editor.getSnapshot().canUndo).toBe(false);
  });

  it('does not recreate an undone variant when the base is edited', () => {
    const editor = session();
    createNamedVariant(editor);
    editor.undo();
    editor.execute({ type: 'setProp', nodeId: 'root', prop: 'text', value: 'Updated base' });
    expect(editor.getSnapshot().document.variantPresets).toBeUndefined();
    const root = editor.getSnapshot().document.nodes.root;
    expect(root?.type === 'text' ? root.text : undefined).toBe('Updated base');
  });
});
