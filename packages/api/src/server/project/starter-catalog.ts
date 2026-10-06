import { validateDocumentFile, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../../../examples/button.json';
import input from '../../../../../examples/form-input.json';
import link from '../../../../../examples/link.json';

import textarea from '../../../../../examples/atoms/form-textarea.json';
import select from '../../../../../examples/atoms/form-native-select.json';
import checkbox from '../../../../../examples/atoms/form-checkbox.json';
import radio from '../../../../../examples/atoms/form-radio.json';
import radioOption from '../../../../../examples/components/form-radio-option.json';
import radioGroup from '../../../../../examples/components/form-radio-group.json';
import checkboxOption from '../../../../../examples/components/form-checkbox-option.json';
import checkboxGroup from '../../../../../examples/components/form-checkbox-group.json';

const atoms = [button, input, link, textarea, select, checkbox, radio];
const components = [radioOption, radioGroup, checkboxOption, checkboxGroup];

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
