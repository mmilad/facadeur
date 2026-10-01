// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

afterEach(cleanup);
it('edits rendering in the active variant and exposes the referenced component variants', async () => {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      {
        version: 1,
        id: 'host',
        name: 'Host',
        kind: 'component',
        fields: [{ name: 'enabled', type: 'boolean' }],
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

  await user.selectOptions(screen.getByRole('combobox', { name: 'Variant selection' }), 'checkbox');
  const active = session.getSnapshot().activeDocument.nodes.control;
  expect(active?.type === 'instance' && active.variants?.variant).toBe('checkbox');
  await user.click(screen.getByRole('button', { name: 'Use variant rules' }));
  const automatic = session.getSnapshot().activeDocument.nodes.control;
  expect(automatic?.type === 'instance' && automatic.variants?.variant).toBeUndefined();
  act(() => session.undo());
  const restored = session.getSnapshot().activeDocument.nodes.control;
  expect(restored?.type === 'instance' && restored.variants?.variant).toBe('checkbox');
});
