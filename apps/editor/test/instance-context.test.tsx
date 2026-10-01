/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const target: DocumentFile = {
  version: 1,
  id: 'nested-target',
  name: 'Nested target',
  kind: 'component',
  variants: [
    { name: 'default' },
    { name: 'compact', overrides: { nodes: { root: { text: 'Compact' } } } },
  ],
  root: { id: 'root', type: 'text', text: 'Default' },
};

const owner: DocumentFile = {
  version: 1,
  id: 'context-owner',
  name: 'Context owner',
  kind: 'component',
  fields: [{ name: 'compact', type: 'boolean', default: true }],
  variants: [
    { name: 'default' },
    { name: 'compact-owner', overrides: { fields: { compact: false } } },
  ],
  root: {
    id: 'root',
    type: 'frame',
    children: [
      {
        id: 'instance',
        type: 'instance',
        component: 'nested-target',
        variantRules: [{ when: { path: 'compact', truthy: true }, variant: 'compact' }],
      },
    ],
  },
};

const documents = validateCatalog([target, owner]);

describe('instance inspector context', () => {
  afterEach(() => cleanup());

  it('keeps nested variant selection read-only while preserving owner tabs and master navigation', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    const view = render(<App session={session} />);
    await act(async () => {
      session.openAsset('context-owner', 'root');
      session.selectNode('instance');
    });

    expect(view.container.querySelector('.instance-context-badge')?.textContent).toBe(
      'Component instance',
    );
    expect(view.container.querySelector('.inspector-context-title')?.textContent).toBe(
      'Nested target',
    );
    expect(view.container.textContent).toContain('Owner · Context owner · Default');
    expect(view.container.textContent).toContain('Nested variant · compact · Rule');
    expect(view.container.querySelector('select[name="variant-variant"]')).toBeNull();
    expect(view.container.querySelector('select[name="variant-rule-0-variant"]')).not.toBeNull();
    expect(view.container.querySelector('button[name="variant-tab-default"]')).not.toBeNull();
    expect(view.container.querySelector('button[name="variant-tab-compact-owner"]')).not.toBeNull();
    expect(view.container.querySelectorAll('button[name="open-component"]')).toHaveLength(1);

    await act(async () => {
      view.container.querySelector<HTMLButtonElement>('button[name="open-component"]')?.click();
    });
    expect(session.getSnapshot().openId).toBe('nested-target');
  });
});
