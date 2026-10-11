/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findNodeByUuid } from '@facadeur/core';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { EditorShell } from '../src/ui/shell/EditorShell';
import type { EditorNavigationAdapter } from '../src/ui/shell/navigation/navigation-adapter';

const sessions: EditorSession[] = [];

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createSession() {
  const session = createEditorSession({ projectCatalog: createExampleCatalog() });
  sessions.push(session);
  return session;
}

function createTestNavigation(initialSearch = ''): EditorNavigationAdapter {
  let search = initialSearch;
  const updateSearch = (href: string) => {
    search = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
  };
  return {
    pathname: '/',
    get search() {
      return search;
    },
    push: updateSearch,
    replace: updateSearch,
  };
}

async function pressKey(event: KeyboardEventInit) {
  await act(async () => {
    fireEvent.keyDown(window, event);
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
    });
  });
}

describe('catalog editor shell', () => {
  afterEach(() => {
    sessions.splice(0).forEach((session) => session.destroy());
  });

  it('uses viewport-height shell layout and independent sidebar scrolling', () => {
    const stylesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/ui/styles');
    const baseCss = readFileSync(path.join(stylesDir, 'base.css'), 'utf8');
    const shellCss = readFileSync(path.join(stylesDir, 'shell.css'), 'utf8');
    const sidebarCss = readFileSync(path.join(stylesDir, 'sidebar.css'), 'utf8');

    expect(baseCss).toContain('height: 100vh');
    expect(baseCss).toContain('height: 100dvh');
    expect(baseCss.indexOf('height: 100vh')).toBeLessThan(baseCss.indexOf('height: 100dvh'));
    expect(baseCss).toMatch(/html\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(baseCss).toMatch(/body,\s*\n#__next\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(shellCss).toMatch(/\.workspace\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(sidebarCss).toMatch(/\.side-scroll\s*\{[\s\S]*?overflow:\s*auto/);
  });

  it('renders the shell and selected design surface around the canonical catalog', () => {
    const session = createSession();
    const view = render(
      <EditorShell session={session} navigation={createTestNavigation('surface=colors')} />,
    );

    expect(view.container.querySelector('.app')).not.toBeNull();
    expect(view.container.querySelector('.workspace')).not.toBeNull();
    expect(view.container.querySelector('aside.side-left')).not.toBeNull();
    expect(view.container.querySelector('[data-testid="editor-subnav"]')).not.toBeNull();
    expect(
      view.container.querySelector('.design-domain-stage[data-design-domain="colors"]'),
    ).not.toBeNull();
    expect(
      view.container.querySelector(`[data-asset-id="${exampleIds.components.card.definition}"]`),
    ).not.toBeNull();
  });

  it('removes a selected catalog node from the shell keyboard shortcut', async () => {
    const session = createSession();
    vi.spyOn(session.core, 'persist').mockResolvedValue();
    session.openAsset(exampleIds.components.card.definition);
    session.selectNode(exampleIds.components.card.nodes.title);
    render(<EditorShell session={session} navigation={createTestNavigation()} />);

    await pressKey({ key: 'Delete' });

    expect(
      findNodeByUuid(
        session.core.getSnapshot().openDefinition!.root,
        exampleIds.components.card.nodes.title,
      ),
    ).toBeNull();
  });

  it('wraps a selected catalog node using Core tree operations', async () => {
    const session = createSession();
    vi.spyOn(session.core, 'persist').mockResolvedValue();
    session.openAsset(exampleIds.components.card.definition);
    session.selectNode(exampleIds.components.card.nodes.title);
    render(<EditorShell session={session} navigation={createTestNavigation()} />);

    await pressKey({ key: 'g', ctrlKey: true, altKey: true });

    const definition = session.core.getSnapshot().openDefinition!;
    const wrapper = findNodeByUuid(definition.root, session.getSnapshot().selectedNodeId!);
    expect(wrapper?.dom.children?.map((node) => node.uuid)).toEqual([
      exampleIds.components.card.nodes.title,
    ]);
  });

  it('nudges an absolutely positioned catalog node through its style record', async () => {
    const session = createSession();
    vi.spyOn(session.core, 'persist').mockResolvedValue();
    session.openAsset(exampleIds.components.card.definition);
    session.core.patchNodeStyleRecord(exampleIds.components.card.nodes.title, {
      position: 'absolute',
      left: '10px',
      top: '20px',
    });
    session.selectNode(exampleIds.components.card.nodes.title);
    render(<EditorShell session={session} navigation={createTestNavigation()} />);

    await pressKey({ key: 'ArrowRight' });

    const node = findNodeByUuid(
      session.core.getSnapshot().openDefinition!.root,
      exampleIds.components.card.nodes.title,
    );
    expect(node?.style).toMatchObject({ left: '11px', top: '20px' });
  });
});
