/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { structuralNodeFields, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { parsePreviewFieldValue } from '../src/domain/preview-data.js';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const documents: DocumentFile[] = [
  {
    version: 1,
    id: 'alpha',
    name: 'Alpha',
    kind: 'component',
    fields: [{ name: 'label', type: 'text' }],
    root: { id: 'root', type: 'text', text: 'Alpha' },
  },
  {
    version: 1,
    id: 'beta',
    name: 'Beta',
    kind: 'component',
    fields: [{ name: 'label', type: 'number' }],
    root: { id: 'root', type: 'text', text: 'Beta' },
  },
  {
    version: 1,
    id: 'structural',
    name: 'Structural',
    kind: 'component',
    previewData: { fields: { items: [{ label: 'Preview' }] } },
    root: {
      id: 'root',
      type: 'repeater',
      name: 'Repeated choice',
      children: [
        {
          id: 'chooser',
          type: 'switch',
          name: 'Chooser',
          children: [
            { id: 'alpha-instance', type: 'instance', component: 'alpha' },
            { id: 'beta-instance', type: 'instance', component: 'beta' },
          ],
        },
      ],
    },
  },
  {
    version: 1,
    id: 'schema-value',
    name: 'Schema value',
    kind: 'component',
    fields: [
      {
        name: 'mixed',
        type: 'array',
        items: {
          type: 'text',
          schema: {
            anyOf: [
              { type: 'string' },
              { type: 'object', properties: { label: { type: 'string' } } },
            ],
          },
        },
      },
    ],
    previewData: { fields: { mixed: ['one', { label: 'two' }] } },
    root: { id: 'root', type: 'text', text: 'Schema value' },
  },
  {
    version: 1,
    id: 'section-structural',
    name: 'Section structural',
    kind: 'section',
    root: {
      id: 'root',
      type: 'repeater',
      children: [{ id: 'alpha-instance', type: 'instance', component: 'alpha' }],
    },
  },
];

describe('structural node properties', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;
  let session: EditorSession | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    session?.destroy();
    host?.remove();
    root = null;
    host = null;
    session = null;
  });

  it('shows only content controls and the derived schema targets', async () => {
    session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session!} />));
    await act(async () => session?.openAsset('structural', 'root'));

    const tabs = [...host.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent);
    expect(tabs).toEqual(['Content']);
    expect(host.textContent).toContain('Repeater root · Structural');
    expect(host.querySelector('[data-testid="structural-node-schema"]')?.textContent).toContain(
      'anyOf',
    );
    expect(host.querySelector('[data-testid="structural-schema-targets"]')?.textContent).toContain(
      'Alpha',
    );
    expect(host.querySelector('[data-testid="structural-schema-targets"]')?.textContent).toContain(
      'Beta',
    );
    const snap = session!.getSnapshot();
    const catalog = new Map(
      session!.documentStores().map((store) => {
        const document = store.getDocument();
        return [document.id, document] as const;
      }),
    );
    const items = structuralNodeFields(snap.document, {
      documents: catalog,
      schemaCatalog: snap.design.schemaCatalog,
    }).get('items');
    expect(items?.schema?.items?.anyOf).toBeTruthy();
    expect(() => parsePreviewFieldValue(items!, '[{"label":true}]')).toThrow(
      /JSON Schema contract/,
    );
    const value = host.querySelector<HTMLTextAreaElement>('textarea[name="example-items"]');
    expect(value?.value).toBe('[{"label":"Preview"}]');
    expect(host.querySelector('.field-schema pre')?.textContent).toContain('anyOf');

    const user = userEvent.setup();
    await act(async () =>
      user.click(
        [...host!.querySelectorAll('summary')].find(
          (summary) => summary.textContent === 'Advanced JSON',
        )!,
      ),
    );
    await act(async () => {
      await user.clear(value!);
      await user.paste('[{"label":true}]');
    });
    await act(async () => user.tab());
    expect(session?.getSnapshot().notice?.tone).toBe('error');
    expect(session?.getSnapshot().document.previewData?.fields?.items).toEqual([
      { label: 'Preview' },
    ]);

    const updatedItems = parsePreviewFieldValue(items!, '[{"label":"Updated"}]');
    await act(async () => {
      session?.execute({
        type: 'setPreviewData',
        previewData: { fields: { items: updatedItems! } },
      });
    });
    expect(session?.getSnapshot().document.previewData?.fields?.items).toEqual([
      { label: 'Updated' },
    ]);
  });

  it('keeps mixed item schemas visible beside raw JSON preview values', async () => {
    session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session!} />));
    await act(async () => session?.openAsset('schema-value', 'root'));

    const value = host.querySelector<HTMLTextAreaElement>('textarea[name="example-mixed"]');
    expect(value).toBeTruthy();
    expect(value?.value).toContain('"one"');
    expect(host.querySelector('.field-schema pre')?.textContent).toContain('anyOf');
  });

  it('opens the schema editor for section documents', async () => {
    session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session!} />));
    await act(async () => session?.openAsset('section-structural', 'root'));
    await act(async () => {
      (host!.querySelector('[data-surface="schema"]') as HTMLButtonElement).click();
    });

    expect(host.querySelector('[data-testid="schema-stage"]')).toBeTruthy();
    expect(host.textContent).toContain('Section definition');
    expect(host.querySelector('button[name="schema-type"]')).toBeTruthy();
  });
});
