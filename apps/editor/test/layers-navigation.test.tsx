/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useMemo, useSyncExternalStore } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { CoreController } from '@facadeur/core';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import type { Node } from '@facadeur/domain';
import { createAppService } from '../src/app-service';
import { catalogLayerTree } from '../src/domain/catalog/layer-tree';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { CatalogLayersPanel } from '../src/ui/sidebar/left/CatalogLayersPanel';

const sessions: EditorSession[] = [];

function CatalogLayersView({ session }: { session: EditorSession }) {
  const app = useMemo(
    () =>
      createAppService({
        core: session.core,
        session,
        catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
      }),
    [session],
  );
  const snap = useSyncExternalStore(
    app.subscribe.bind(app),
    app.getSnapshot.bind(app),
    app.getSnapshot.bind(app),
  );
  return (
    <CatalogLayersPanel
      model={snap.sidebar.layers}
      onEvent={(event) => void app.dispatchEditorEvent(event)}
    />
  );
}

function setup() {
  const session = createEditorSession({ projectCatalog: createExampleCatalog() });
  sessions.push(session);
  session.openAsset(exampleIds.components.card.definition);
  render(<CatalogLayersView session={session} />);
  return session;
}

afterEach(() => {
  cleanup();
  sessions.splice(0).forEach((session) => session.destroy());
});

describe('catalog layer navigation', () => {
  it('uses authored node names and falls back to the tag instead of content data', () => {
    const catalog = createExampleCatalog();
    const root: Node = {
      uuid: 'root',
      dom: {
        tagName: 'main',
        children: [
          {
            uuid: 'named',
            name: '  Primary action  ',
            data: { name: 'form field value' },
            dom: { tagName: 'button', data: { name: 'DOM data value' } },
          },
          {
            uuid: 'unnamed',
            data: { name: 'another form value' },
            dom: { tagName: 'input', data: { name: 'DOM data value' } },
          },
        ],
      },
    };

    const core = new CoreController(catalog);
    core.openDefinition(exampleIds.components.card.definition);
    const tree = catalogLayerTree('definition-1', root, core);

    expect(tree.name).toBe('root');
    expect(tree.children.map(({ name }) => name)).toEqual(['Primary action', 'input']);
  });

  it('selects catalog nodes and reveals a selected descendant after collapsing its parent', async () => {
    const session = setup();
    const layers = within(screen.getByRole('region', { name: 'Layers' }));
    const user = userEvent.setup();

    await user.click(layers.getByRole('button', { name: 'eyebrow p' }));
    expect(session.getSnapshot().selectedCatalogNodeUuid).toBe(
      exampleIds.components.card.nodes.eyebrow,
    );

    await user.click(layers.getByRole('button', { name: 'Collapse root' }));
    expect(layers.queryByRole('button', { name: 'eyebrow p' })).not.toBeInTheDocument();

    session.selectNode(exampleIds.components.card.nodes.title);
    await waitFor(() => {
      expect(layers.getByRole('button', { name: 'title h2' })).toBeVisible();
    });
  });

  it('deletes a catalog layer from its context menu', async () => {
    const session = setup();
    const layers = within(screen.getByRole('region', { name: 'Layers' }));
    const user = userEvent.setup();

    await user.pointer({
      keys: '[MouseRight>]',
      target: layers.getByRole('button', { name: 'body p' }),
    });
    await user.click(screen.getByRole('menuitem', { name: 'Delete layer' }));

    await waitFor(() => {
      expect(
        session.core
          .getSnapshot()
          .openDefinition?.root.dom.children?.some(
            (node) => node.uuid === exampleIds.components.card.nodes.body,
          ),
      ).toBe(false);
    });
  });

  it('inserts an atom instance under a catalog layer', async () => {
    const session = setup();
    const layers = within(screen.getByRole('region', { name: 'Layers' }));

    fireEvent.contextMenu(layers.getByRole('button', { name: 'root article' }));
    const insertInside = screen.getByRole('menuitem', { name: 'Insert inside' });
    fireEvent.mouseEnter(insertInside.parentElement!);
    fireEvent.click(insertInside);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Button' }));

    await waitFor(() => {
      expect(
        session.core
          .getSnapshot()
          .openDefinition?.root.dom.children?.some(
            (node) => node.config?.definitionRef === exampleIds.components.button.definition,
          ),
      ).toBe(true);
    });
  });
});
