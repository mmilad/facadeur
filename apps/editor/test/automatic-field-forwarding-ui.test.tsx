/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session';
import { SchemaStage } from '../src/ui/stage/SchemaStage';

afterEach(cleanup);

describe('canonical schema UI', () => {
  it('includes automatically inherited child fields in Defaults without a separate Props editor', () => {
    const documents: DocumentFile[] = [
      {
        version: 1,
        id: 'input',
        name: 'Input',
        kind: 'atom',
        fields: [{ name: 'label', type: 'text' }],
        root: { id: 'input-root', type: 'text', text: 'input' },
      },
      {
        version: 1,
        id: 'form',
        name: 'Form',
        kind: 'component',
        root: {
          id: 'form-root',
          type: 'frame',
          children: [
            { id: 'active-input', type: 'instance', component: 'input' },
            {
              id: 'manual-input',
              type: 'instance',
              component: 'input',
              forwardFields: false,
            },
          ],
        },
      },
    ];
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    session.openAsset('form');
    expect(session.getSnapshot().document.nodes['manual-input']).toMatchObject({
      forwardFields: false,
    });
    expect(session.getSnapshot().automaticFieldGroups).toMatchObject([
      { instanceId: 'active-input', enabled: true },
      { instanceId: 'manual-input', enabled: false },
    ]);

    const { container } = render(
      <SchemaStage
        session={session}
        snap={session.getSnapshot()}
        onOpenSchemas={() => undefined}
      />,
    );

    expect(container.querySelector('#schema-defaults-title')?.textContent).toBe('Defaults');
    expect(container.querySelector('input[name="default-label"]')).toBeInTheDocument();
    expect(container.querySelector('h3')?.textContent).not.toBe('Props');
  });
});
