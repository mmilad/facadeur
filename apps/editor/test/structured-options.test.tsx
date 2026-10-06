// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { validateDocumentFile, type FieldValue } from '@facadeur/core';
import select from '../../../examples/atoms/form-native-select.json';
import { InstanceFieldOverride } from '../src/ui/controls/instance/InstanceFieldOverride';
import { SchemaPreviewForm } from '../src/ui/stage/SchemaPreviewForm';
import { createEditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardDesign } from './fixtures/example-catalog';

afterEach(cleanup);
describe('structured option editing', () => {
  it('edits, disables, adds and removes option rows in instance overrides', () => {
    const field = validateDocumentFile(select).fields![0]!;
    let result: FieldValue | null = null;
    function Harness() {
      const [value, setValue] = useState<FieldValue>([
        { label: 'First', value: 'first', disabled: false },
      ]);
      return (
        <InstanceFieldOverride
          field={field}
          override={value}
          onSetField={(next) => {
            result = next;
            setValue(next ?? []);
          }}
        />
      );
    }
    render(<Harness />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Label' }), {
      target: { value: 'Edited' },
    });
    fireEvent.click(screen.getByRole('switch', { name: 'Disabled' }));
    expect(result).toEqual([{ label: 'Edited', value: 'first', disabled: true }]);
    fireEvent.click(screen.getByRole('button', { name: 'Add Options item' }));
    expect(screen.getAllByRole('textbox', { name: 'Label' })).toHaveLength(2);
    expect(screen.getAllByRole('textbox', { name: 'Value' })).toHaveLength(2);
    expect(document.querySelectorAll('.eu-section--accordion')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Options 1' }));
    expect(screen.getAllByRole('textbox', { name: 'Label' })).toHaveLength(1);
  });
  it('adds collapsible option rows in schema defaults', () => {
    const file = validateDocumentFile(select);
    const session = createEditorSession({ documents: [file], design: editorStandardDesign() });
    function SchemaDefaultsHarness() {
      const [, refresh] = useState(0);
      useEffect(() => session.subscribe(() => refresh((count) => count + 1)), [session]);
      const snap = session.getSnapshot();
      return (
        <SchemaPreviewForm
          session={session}
          use={snap.document.schemaUse ?? null}
          schemas={[]}
          fields={snap.documentScopeFields}
        />
      );
    }
    render(<SchemaDefaultsHarness />);
    const optionLabels = () =>
      screen
        .getAllByRole('textbox', { name: 'Label' })
        .filter((node) => node.closest('.eu-section--accordion'));
    const optionValues = () =>
      screen
        .getAllByRole('textbox', { name: 'Value' })
        .filter((node) => node.closest('.eu-section--accordion'));
    fireEvent.click(screen.getByRole('button', { name: 'Add Options item' }));
    expect(optionLabels()).toHaveLength(1);
    expect(optionValues()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Add Options item' }));
    expect(optionLabels()).toHaveLength(2);
    session.destroy();
  });
  it('shows typed option rows in the selected Select root inspector', () => {
    const file = validateDocumentFile(select);
    const session = createEditorSession({ documents: [file], design: editorStandardDesign() });
    session.openAsset(file.id, 'root');
    render(<App session={session} />);
    expect(screen.getAllByRole('textbox', { name: 'Label' })).toHaveLength(3);
    expect(
      screen.getAllByRole('textbox', { name: 'Value' }).filter((node) => node.closest('.eu-section--accordion')),
    ).toHaveLength(3);
    expect(
      screen
        .getAllByRole('switch', { name: 'Disabled' })
        .filter((node) => node.closest('.eu-section--accordion')),
    ).toHaveLength(3);
    session.destroy();
  });
});
