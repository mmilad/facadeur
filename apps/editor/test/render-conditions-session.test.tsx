// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

afterEach(cleanup);
it('edits rendering and variant rules in the owning variant while showing nested selection read-only', async () => {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      {
        version: 1,
        id: 'host',
        name: 'Host',
        kind: 'component',
        fields: [{ name: 'enabled', type: 'boolean' }],
        previewData: { fields: { enabled: true } },
        variants: [{ name: 'compact' }],
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'control', type: 'instance', component: 'input' }],
        },
      },
      {
        version: 1,
        id: 'input',
        name: 'Input',
        kind: 'atom',
        variants: [{ name: 'checkbox' }],
        variantLabels: { default: 'Text input', checkbox: 'Checkbox' },
        root: { id: 'root', type: 'text', text: 'Input' },
      },
    ],
  });
  session.openAsset('host');
  session.setActiveVariant('compact');
  session.selectNode('control');
  render(<App session={session} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add condition' }));
  expect(session.getSnapshot().activeDocument.nodes.control?.displayOn).toEqual({
    path: 'enabled',
    truthy: true,
  });
  expect(session.getSnapshot().document.nodes.control?.displayOn).toBeUndefined();
  act(() => session.undo());
  expect(session.getSnapshot().activeDocument.nodes.control?.displayOn).toBeUndefined();

  expect(screen.queryByRole('combobox', { name: 'Variant selection' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Add variant rule' }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Rule 1 variant' }), 'checkbox');
  const active = session.getSnapshot().activeDocument.nodes.control;
  expect(active?.type === 'instance' && active.variantRules?.[0]?.variant).toBe('checkbox');
  expect(screen.getByText('Nested variant · Checkbox · Rule')).toBeInTheDocument();
  const base = session.getSnapshot().document.nodes.control;
  expect(base?.type === 'instance' ? base.variantRules : undefined).toBeUndefined();
  act(() => session.undo());
  const restored = session.getSnapshot().activeDocument.nodes.control;
  expect(restored?.type === 'instance' && restored.variantRules?.[0]?.variant).toBe('default');
});
