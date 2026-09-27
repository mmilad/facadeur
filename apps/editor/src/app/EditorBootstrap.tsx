'use client';

import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { useMemo } from 'react';
import button from '../../../../examples/button.json';
import card from '../../../../examples/card.json';
import input from '../../../../examples/input.json';
import link from '../../../../examples/link.json';
import signIn from '../../../../examples/sign-in.json';
import textarea from '../../../../examples/textarea.json';
import editorControlsPage from '../../../../examples/editor-controls-page.json';
import editorControlsSection from '../../../../examples/editor-controls-section.json';
import editorFieldRow from '../../../../examples/editor-field-row.json';
import editorSegmented from '../../../../examples/editor-segmented.json';
import editorSelect from '../../../../examples/editor-select.json';
import editorTextInput from '../../../../examples/editor-text-input.json';
import editorToggle from '../../../../examples/editor-toggle.json';
import specimenPage from '../../../../examples/specimen-page.json';
import specimenSection from '../../../../examples/specimen-section.json';
import { createEditorSession } from '../domain/session';
import { EditorShell } from '../ui/shell/EditorShell';

const sources: Record<string, string> = {
  button: 'button.json',
  link: 'link.json',
  input: 'input.json',
  textarea: 'textarea.json',
  card: 'card.json',
  'sign-in': 'sign-in.json',
  'specimen-section': 'specimen-section.json',
  specimen: 'specimen-page.json',
  'editor-controls': 'editor-controls-page.json',
  'editor-controls-section': 'editor-controls-section.json',
  'editor-field-row': 'editor-field-row.json',
  'editor-segmented': 'editor-segmented.json',
  'editor-select': 'editor-select.json',
  'editor-text-input': 'editor-text-input.json',
  'editor-toggle': 'editor-toggle.json',
  'project-template': 'project-template.json',
};

export function EditorBootstrap() {
  const session = useMemo(() => {
    const documents = validateCatalog([
      button,
      link,
      input,
      textarea,
      card,
      signIn,
      editorTextInput,
      editorSelect,
      editorToggle,
      editorSegmented,
      editorFieldRow,
      specimenSection,
      editorControlsSection,
      specimenPage,
      editorControlsPage,
    ]);
    return createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
      sources,
    });
  }, []);

  return <EditorShell session={session} />;
}
