/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { Binding, FieldDefinition } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import formInput from '../../../examples/form-input.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { boundFields } from '../src/ui/sidebar/properties/content/bound-fields.js';
import { App } from '../src/ui/shell/EditorShell.js';
import { expandExampleCatalog } from './fixtures/example-catalog.js';

const fields: FieldDefinition[] = [
  { name: 'value', type: 'text' },
  { name: 'placeholder', type: 'text' },
  { name: 'label', type: 'text' },
];

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
});
