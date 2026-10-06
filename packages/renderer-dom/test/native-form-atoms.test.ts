// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { renderDocument } from '../src/render';
import select from '../../../examples/atoms/form-native-select.json';
import textarea from '../../../examples/atoms/form-textarea.json';
import checkbox from '../../../examples/atoms/form-checkbox.json';
import radio from '../../../examples/atoms/form-radio.json';

describe('native form atoms', () => {
  it('renders native options, selection and editable textarea samples without child layers', () => {
    const documents = validateCatalog([select, textarea, checkbox, radio]);
    const parent = document.createElement('main');
    const selectDocument = structuredClone(documents[0]!);
    selectDocument.previewData!.fields!.value = 'second';
    for (const field of selectDocument.fields ?? [])
      field.default = selectDocument.previewData!.fields![field.name];
    renderDocument(selectDocument, documents, parent, { paintRoot: true });
    const control = parent.querySelector('select')!;
    expect([...control.options].map((option) => option.textContent)).toEqual([
      'Choose an option',
      'First option',
      'Second option',
    ]);
    expect(control.value).toBe('second');
    const textareaDocument = structuredClone(documents[1]!);
    textareaDocument.previewData!.fields!.value = 'Editable';
    for (const field of textareaDocument.fields ?? [])
      field.default = textareaDocument.previewData!.fields![field.name];
    renderDocument(textareaDocument, documents, parent, { paintRoot: true });
    const area = parent.querySelector('textarea')!;
    expect(area.value).toBe('Editable');
    expect(area.readOnly).toBe(false);
  });
  it('rejects an options binding on another element or an array with the wrong shape', () => {
    const invalid = structuredClone(select) as DocumentFile;
    if (invalid.root.type !== 'frame') throw new Error('Expected native frame');
    invalid.root.tag = 'div';
    expect(() => validateCatalog([invalid])).toThrow('native select');
    invalid.root.tag = 'select';
    invalid.fields![0]!.items = { type: 'text' };
    delete invalid.previewData;
    expect(() => validateCatalog([invalid])).toThrow('text value and label');
  });
});
