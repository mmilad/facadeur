/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Binding, DocumentFile, FieldDefinition, SchemaCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import formInput from '../../../examples/form-input.json';
import input from '../../../examples/input.json';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { boundFields } from '../src/ui/sidebar/properties/content/bound-fields';
import { App } from '../src/ui/shell/EditorShell';
import { expandExampleCatalog } from './fixtures/example-catalog';

const fields: FieldDefinition[] = [
  { name: 'value', type: 'text' },
  { name: 'placeholder', type: 'text' },
  { name: 'label', type: 'text' },
];

const inputSchemaCatalog = {
  schemas: [
    {
      id: 'input',
      name: 'Input',
      schema: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          placeholder: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  ],
} satisfies SchemaCatalog;

describe('bound fields', () => {
  it('lists each bound document field once, in binding order', () => {
    const bindings: Binding[] = [
      { field: 'value', target: 'attribute', name: 'value' },
      { field: 'missing', target: 'text' },
      { field: 'value', target: 'attribute', name: 'value' },
      { field: 'placeholder', target: 'attribute', name: 'placeholder' },
    ];
    expect(boundFields(fields, bindings).map((field) => field.name)).toEqual([
      'value',
      'placeholder',
    ]);
  });
});

describe('content example values', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  it('edits a bound field example from the content tab', async () => {
    const session: EditorSession = createEditorSession({
      documents: expandExampleCatalog([formInput]),
      design: createProjectTemplateDocument(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      session.openAsset('form-input');
      session.selectNode('root');
    });

    const placeholder = host.querySelector(
      'input[name="example-placeholder"]',
    ) as HTMLInputElement | null;
    expect(placeholder).toBeInstanceOf(HTMLInputElement);
    expect(host.querySelector('input[name="example-value"]')).toBeInstanceOf(HTMLInputElement);

    const user = userEvent.setup();
    await act(async () => {
      await user.click(placeholder!);
      await user.clear(placeholder!);
      await user.type(placeholder!, 'Email address');
      await user.tab();
    });

    expect(session.getSnapshot().document.previewData?.fields?.placeholder).toBe('Email address');
  });

  it('shows public component fields at the root and applies schema defaults', async () => {
    const documents = expandExampleCatalog([input]).map((document) =>
      document.id === 'input'
        ? {
            ...document,
            expose: undefined,
            schemaUse: {
              direct: { kind: 'schema' as const, schemaId: 'input' },
              defaults: { value: 'Schema default' },
            },
          }
        : document,
    );
    const session = createEditorSession({
      documents,
      design: { ...createProjectTemplateDocument(), schemaCatalog: inputSchemaCatalog },
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      session.openAsset('input');
      session.selectNode('root');
    });

    const value = host.querySelector('input[name="example-value"]') as HTMLInputElement | null;
    expect(value).toBeInstanceOf(HTMLInputElement);
    expect(value?.value).toBe('Schema default');
    expect(host.querySelector('input[name="example-label"]')).toBeInstanceOf(HTMLInputElement);
    expect(host.querySelector('input[name="example-placeholder"]')).toBeInstanceOf(
      HTMLInputElement,
    );
    expect(host.querySelector('input[name="example-name"]')).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      fireEvent.change(value!, { target: { value: 'Mapped example' } });
      fireEvent.blur(value!);
    });
    expect(session.getSnapshot().document.previewData?.fields?.value).toBe('Mapped example');
  });

  it('offers exposed owner fields as sources for nested instance bindings', async () => {
    const manualInput = structuredClone(input) as DocumentFile;
    if (manualInput.root.type !== 'frame') throw new Error('Expected the input root frame');
    const control = manualInput.root.children?.find((node) => node.id === 'control');
    if (control?.type !== 'instance') throw new Error('Expected the input control instance');
    control.forwardFields = false;
    const session = createEditorSession({
      documents: expandExampleCatalog([manualInput]),
      design: createProjectTemplateDocument(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      session.openAsset('input');
      session.selectNode('control');
    });

    const options = [
      ...host.querySelectorAll<HTMLSelectElement>(
        'select[name="field-binding-placeholder"] option',
      ),
    ].map((option) => option.value);
    expect(options).toEqual(['', 'label', 'value', 'placeholder', 'name']);
  });
});
