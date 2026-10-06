import { validateDocumentFile, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../../../examples/button.json';
import link from '../../../../../examples/link.json';
import image from '../../../../../examples/atoms/image.json';
import textHeading from '../../../../../examples/atoms/text-heading.json';
import textBody from '../../../../../examples/atoms/text-body.json';
import contentCard from '../../../../../examples/components/content-card.json';
import fullbleedTeaser from '../../../../../examples/components/fullbleed-teaser.json';

const atoms = [button, link, image, textHeading, textBody];
const components = [contentCard, fullbleedTeaser];

/** Each project receives its own editable copies of the built-in atom definitions. */
export function starterCatalog() {
  const design = { ...createProjectTemplateDocument(), schemaCatalog: { schemas: [] } };
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
    ...[...atoms, ...components].map((atom) => {
      const document = validateDocumentFile(structuredClone(atom));
      return { source: document.id + '.json', document };
    }),
  ];
}
