import { describe, expect, it } from 'vitest';
import {
  clearDocumentSaved,
  isDocumentDirty,
  markDocumentSaved,
  type SavedJsonBaselines,
} from '../src/domain/assets/save-state';
import { createEditorSession } from '../src/domain/session';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';

const documents = editorStandardCatalog();

describe('save-state baselines', () => {
  it('tracks dirty per id from baselines', () => {
    const editor = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    const doc = editor.getSnapshot().document;
    const baselines: SavedJsonBaselines = new Map();
    expect(isDocumentDirty(baselines, doc.id, doc)).toBe(true);
    markDocumentSaved(baselines, doc.id, doc);
    expect(isDocumentDirty(baselines, doc.id, doc)).toBe(false);
    clearDocumentSaved(baselines, doc.id);
    expect(isDocumentDirty(baselines, doc.id, doc)).toBe(true);
  });
});
