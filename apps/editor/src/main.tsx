import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createRoot } from 'react-dom/client';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession } from './session.js';
import { App } from './ui/App.js';
import './styles.css';

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

const root = document.querySelector('#root');
if (!(root instanceof HTMLElement)) {
  throw new Error('Missing #root');
}

try {
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
  const session = createEditorSession({
    documents,
    design: createProjectTemplateDocument(),
    sources,
  });
  createRoot(root).render(<App session={session} />);
} catch (error) {
  const message = document.createElement('p');
  message.className = 'boot-error';
  const detail = error instanceof Error ? error.message : 'Unknown error';
  message.textContent = `Could not open the specimen (${detail}).`;
  root.replaceChildren(message);
}
