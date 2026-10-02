import { createProjectTemplateDocument } from '@facadeur/tokens';
import { describe, expect, it } from 'vitest';
import {
  clearDocumentSaved,
  isDocumentDirty,
  markDocumentSaved,
  type SavedJsonBaselines,
} from '../src/domain/assets/save-state.js';
import { createEditorSession } from '../src/domain/session.js';
import { editorStandardCatalog } from './fixtures/example-catalog.js';

const documents = editorStandardCatalog();

describe('save-state baselines', () => {
  it('tracks dirty per id from baselines', () => {
    const editor = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
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
