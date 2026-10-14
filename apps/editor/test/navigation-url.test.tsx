// @vitest-environment jsdom
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { useSyncExternalStore } from 'react';
import { useEditorNavigation } from '../src/ui/shell/navigation/useEditorNavigation';
import type { EditorNavigationAdapter } from '../src/ui/shell/navigation/navigation-adapter';

const routing = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  replace: vi.fn(),
}));

const sessions: EditorSession[] = [];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  routing.search = '';
  routing.push.mockReset();
  routing.replace.mockReset();
  const updateSearch = (href: string) => {
    routing.search = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
  };
  routing.push.mockImplementation(updateSearch);
  routing.replace.mockImplementation(updateSearch);
});

afterEach(() => {
  sessions.splice(0).forEach((session) => session.destroy());
});

function createSession() {
  const session = createEditorSession({ projectCatalog: createExampleCatalog() });
  sessions.push(session);
  return session;
}

function createNavigation(): EditorNavigationAdapter {
  return {
    pathname: '/',
    get search() {
      return routing.search;
    },
    push: routing.push,
    replace: routing.replace,
  };
}

function NavigationProbe({
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
  const { surface } = useEditorNavigation(session, snapshot, navigation);
  return <output data-testid="navigation">{surface}</output>;
}

describe('Catalog editor URL selection', () => {
  it('restores Catalog node and viewport UUIDs and removes unsupported variant state', async () => {
    routing.search = new URLSearchParams({
      document: exampleIds.components.card.definition,
      layer: exampleIds.components.card.nodes.title,
      viewport: exampleIds.catalog.breakpoints.tablet,
      surface: 'colors',
      variant: 'compact',
      keep: 'yes',
    }).toString();
    const session = createSession();
    render(<NavigationProbe session={session} navigation={createNavigation()} />);

    await waitFor(() => {
      expect(session.getSnapshot().openId).toBe(exampleIds.components.card.definition);
      expect(session.getSnapshot().selectedCatalogNodeUuid).toBe(
        exampleIds.components.card.nodes.title,
      );
      expect(session.getSnapshot().selectedViewportId).toBe(exampleIds.catalog.breakpoints.tablet);
    });
    await waitFor(() => expect(routing.replace).toHaveBeenCalled());

    const canonical = new URL(routing.replace.mock.lastCall?.[0] as string, 'http://localhost');
    expect(canonical.searchParams.get('layer')).toBe(exampleIds.components.card.nodes.title);
    expect(canonical.searchParams.get('viewport')).toBe(exampleIds.catalog.breakpoints.tablet);
    expect(canonical.searchParams.get('surface')).toBe('colors');
    expect(canonical.searchParams.get('keep')).toBe('yes');
    expect(canonical.searchParams.has('variant')).toBe(false);
  });

  it('falls back to the Catalog definition root for an unknown layer UUID', async () => {
    routing.search = new URLSearchParams({
      document: exampleIds.components.card.definition,
      layer: 'missing-layer-uuid',
      viewport: 'missing-breakpoint-uuid',
    }).toString();
    const session = createSession();
    render(<NavigationProbe session={session} navigation={createNavigation()} />);

    await waitFor(() => {
      expect(session.getSnapshot().selectedCatalogNodeUuid).toBe(
        session.getSnapshot().openDefinition?.root.uuid,
      );
      expect(session.getSnapshot().selectedViewportId).toBeNull();
    });
    await waitFor(() => expect(routing.replace).toHaveBeenCalled());
    const canonical = new URL(routing.replace.mock.lastCall?.[0] as string, 'http://localhost');
    expect(canonical.searchParams.get('layer')).toBe(
      session.getSnapshot().openDefinition?.root.uuid,
    );
    expect(canonical.searchParams.has('viewport')).toBe(false);
  });

  it('updates the URL when the selected Catalog node changes', async () => {
    const session = createSession();
    act(() => session.openAsset(exampleIds.components.card.definition));
    render(<NavigationProbe session={session} navigation={createNavigation()} />);

    routing.replace.mockClear();
    act(() => session.selectNode(exampleIds.components.card.nodes.title));

    await waitFor(() => expect(routing.push).toHaveBeenCalled());
    const canonical = new URL(routing.push.mock.lastCall?.[0] as string, 'http://localhost');
    expect(canonical.searchParams.get('document')).toBe(exampleIds.components.card.definition);
    expect(canonical.searchParams.get('layer')).toBe(exampleIds.components.card.nodes.title);
  });
});
