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
import formControlsPage from '../../../../examples/form-controls-page.json';
import formControlsSection from '../../../../examples/form-controls-section.json';
import formFieldRow from '../../../../examples/form-field-row.json';
import formSegmented from '../../../../examples/form-segmented.json';
import formSelect from '../../../../examples/form-select.json';
import formTextInput from '../../../../examples/form-text-input.json';
import formToggle from '../../../../examples/form-toggle.json';
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
  'form-controls': 'form-controls-page.json',
  'form-controls-section': 'form-controls-section.json',
  'form-field-row': 'form-field-row.json',
  'form-segmented': 'form-segmented.json',
  'form-select': 'form-select.json',
  'form-text-input': 'form-text-input.json',
  'form-toggle': 'form-toggle.json',
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
      formTextInput,
      formSelect,
      formToggle,
      formSegmented,
      formFieldRow,
      specimenSection,
      formControlsSection,
      specimenPage,
      formControlsPage,
    ]);
    return createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
      sources,
    });
  }, []);

  return <EditorShell session={session} />;
}
