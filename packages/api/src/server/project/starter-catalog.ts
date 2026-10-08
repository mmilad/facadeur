import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { starterSchemas } from './starter-schemas';

/** Each project receives its own editable copies of the built-in atom definitions. */
export function starterCatalog() {
  const design = {
    ...createProjectTemplateDocument(),
    schemaCatalog: { schemas: structuredClone(starterSchemas) },
  };
  const section: DocumentFile = {
    version: 1,
    id: 'new-section',
    name: 'New section',
    kind: 'section',
    root: {
      id: 'root',
      name: 'Frame',
      type: 'frame',
      children: [{ id: 'heading', type: 'text', text: 'Start building here' }],
    },
  };
  return [
    { source: 'project-template.json', document: design },
    { source: 'new-section.json', document: section },
  ];
}
