/** @vitest-environment jsdom */
import type { DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { rootTokenOverrideCommand, rootTokenTargets } from '../src/domain/root-token-overrides.js';
import { createEditorSession } from '../src/domain/session.js';
import { RootTokenOverridesPanel } from '../src/ui/sidebar/properties/component/RootTokenOverridesPanel.js';

const button: DocumentFile = {
  version: 1,
  id: 'button',
  name: 'Button',
  kind: 'atom',
  componentTokens: {
    background: { path: 'color.bg', label: 'Background', type: 'color', value: '#123456' },
  },
  styles: { declarations: { background: '{color.bg}' } },
  root: { id: 'root', type: 'frame', tag: 'button' },
};
const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  root: {
    id: 'root',
    type: 'frame',
    children: [{ id: 'action', type: 'instance', component: 'button' }],
  },
};
const section: DocumentFile = {
  version: 1,
  id: 'section',
  name: 'Section',
  kind: 'section',
  root: {
    id: 'root',
    type: 'frame',
    children: [
      { id: 'first', type: 'instance', component: 'card' },
      { id: 'second', type: 'instance', component: 'card' },
    ],
  },
};

describe('root exposed token overrides', () => {
  it('collects only reachable descendant public tokens, once for repeated usages', () => {
    const unrelated = { ...button, id: 'unrelated' };
    expect(rootTokenTargets('section', [button, card, section, unrelated])).toEqual([
      { path: 'button.color.bg', label: 'Button · Background', type: 'color', fallback: '#123456' },
    ]);
    expect(rootTokenTargets('button', [button, card, section])).toEqual([]);
  });

  it('includes descendants introduced only by a named variant', () => {
    const variantSection: DocumentFile = {
      ...section,
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      variants: [
        {
          name: 'with-action',
          overrides: {
            insertions: [
              {
                parent: 'root',
                index: 0,
                node: { id: 'action', type: 'instance', component: 'button' },
              },
            ],
          },
        },
      ],
    };
    expect(
      rootTokenTargets('section', [button, variantSection]).map((token) => token.path),
    ).toEqual(['button.color.bg']);
  });

  it('adopts global reads and preserves unrelated values through reset and Undo', () => {
    const session = createEditorSession({
      documents: [button, card, section],
      design: createProjectTemplateDocument(),
    });
    session.openAsset('section', 'root');
    session.execute({
      type: 'setTokenInterface',
      tokenInterface: { sets: { 'color.text.primary': 'black' } },
    });
    session.execute(
      rootTokenOverrideCommand(
        session.getSnapshot().document,
        'button.color.bg',
        '{color.accent.default}',
      ),
    );
    expect(session.getSnapshot().document.tokenInterface?.sets).toEqual({
      'color.text.primary': 'black',
      'button.color.bg': '{color.accent.default}',
    });
    expect(session.getSnapshot().document.tokenInterface?.reads).toContain('color.accent.default');
    session.execute(
      rootTokenOverrideCommand(session.getSnapshot().document, 'button.color.bg', null),
    );
    expect(session.getSnapshot().document.tokenInterface?.sets).toEqual({
      'color.text.primary': 'black',
    });
    session.undo();
    expect(session.getSnapshot().document.tokenInterface?.sets?.['button.color.bg']).toBe(
      '{color.accent.default}',
    );
    expect(
      session.boardDocuments().find((document) => document.id === 'button')?.componentTokens,
    ).toEqual(button.componentTokens);
    session.destroy();
  });

  it('offers the exposed token on a section root and resets only its saved override', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const session = createEditorSession({
      documents: [button, card, section],
      design: createProjectTemplateDocument(),
    });
    session.openAsset('section', 'root');
    session.execute(
      rootTokenOverrideCommand(session.getSnapshot().document, 'button.color.bg', 'red'),
    );
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(<RootTokenOverridesPanel session={session} snap={session.getSnapshot()} />),
      );
      expect(host.querySelector('[data-root-token-path="button.color.bg"]')).toBeTruthy();
      const input = host.querySelector(
        'input[name="root-token-button.color.bg"]',
      ) as HTMLInputElement;
      expect(input.value).toBe('red');
      const reset = host.querySelector(
        'button[aria-label="Reset Button · Background"]',
      ) as HTMLButtonElement;
      await act(async () => reset.click());
      expect(
        session.getSnapshot().document.tokenInterface?.sets?.['button.color.bg'],
      ).toBeUndefined();
      session.undo();
      expect(session.getSnapshot().document.tokenInterface?.sets?.['button.color.bg']).toBe('red');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      session.destroy();
    }
  });
});
