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
      specimenSection,
      specimenPage,
    ]);
    return createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
      sources,
    });
  }, []);

  return <EditorShell session={session} />;
}
