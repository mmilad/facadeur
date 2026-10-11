/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { EditorSubnav } from '../src/ui/shell/navigation/EditorSubnav';
import { useEditorNavigation } from '../src/ui/shell/navigation/useEditorNavigation';
import type { EditorNavigationAdapter } from '../src/ui/shell/navigation/navigation-adapter';
import { SettingsSections } from '../src/ui/settings/SettingsSections';

function createTestNavigation(): EditorNavigationAdapter {
  let search = '';
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

function NavigationHarness({
  session,
  navigation,
}: {
  session: EditorSession;
  navigation: EditorNavigationAdapter;
}) {
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  const { surface, setSurface } = useEditorNavigation(session, snapshot, navigation);
  return (
    <>
      <EditorSubnav surface={surface} onSelectSurface={setSurface} />
      <SettingsSections surface={surface} onSelect={setSurface} />
      <output data-testid="surface">{surface}</output>
      <output data-testid="selected-node">{snapshot.selectedNodeId}</output>
    </>
  );
}

describe('editor subnavigation', () => {
  afterEach(cleanup);

  it('shows Icons in the subnav and keeps Schemas within Settings', () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    const view = render(
      <NavigationHarness session={session} navigation={createTestNavigation()} />,
    );

    expect(view.container.querySelector('[data-surface="icons"]')).not.toBeNull();
    expect(view.container.querySelector('[data-surface="schemas"]')).toBeNull();
    expect(view.container.querySelector('[data-design-domain="icons"]')).toBeNull();

    fireEvent.click(view.container.querySelector('[data-subnav="settings"]')!);
    fireEvent.click(view.container.querySelector('[data-settings-tab="schemas"]')!);
    expect(view.getByTestId('surface').textContent).toBe('schemas');
    expect(
      view.container.querySelector('[data-subnav="settings"]')?.getAttribute('aria-current'),
    ).toBe('page');
    expect(
      view.container.querySelector('[data-settings-tab="schemas"]')?.getAttribute('aria-current'),
    ).toBe('page');

    fireEvent.click(view.container.querySelector('[data-settings-tab="colors"]')!);
    expect(view.getByTestId('surface').textContent).toBe('colors');
    session.destroy();
  });

  it('switches Editor, Schema, and Preview without resetting the selected catalog node', () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    session.openAsset(exampleIds.components.card.definition);
    const selectedNodeId = session.getSnapshot().selectedNodeId;
    const view = render(
      <NavigationHarness session={session} navigation={createTestNavigation()} />,
    );

    fireEvent.click(view.container.querySelector('[data-surface="schema"]')!);
    expect(view.getByTestId('surface').textContent).toBe('schema');
    fireEvent.click(view.container.querySelector('[data-surface="code"]')!);
    expect(view.getByTestId('surface').textContent).toBe('code');
    fireEvent.click(view.container.querySelector('[data-surface="preview"]')!);
    expect(view.getByTestId('surface').textContent).toBe('preview');
    fireEvent.click(view.container.querySelector('[data-surface="editor"]')!);
    expect(view.getByTestId('surface').textContent).toBe('editor');
    expect(view.getByTestId('selected-node').textContent).toBe(selectedNodeId);

    session.destroy();
  });
});
