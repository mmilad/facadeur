import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import {
  clearDocumentSaved,
  isDocumentDirty,
  markDocumentSaved,
  type SavedJsonBaselines,
} from '../src/domain/save-state.js';
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
