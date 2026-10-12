/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../src/domain/session';
import { CatalogNodeInspector } from '../src/ui/sidebar/right/components/CatalogNodeInspector';

const definitionUuid = exampleIds.components.formInput.definition;
const rootUuid = exampleIds.components.formInput.nodes.root;

function catalogWithAttributeExample() {
  const catalog = createExampleCatalog();
  const definition = catalog.atoms[definitionUuid];
  if (!definition) throw new Error('Expected the shared form input atom example');

  catalog.atoms[definitionUuid] = {
    ...definition,
    root: {
      ...definition.root,
      dom: {
        ...definition.root.dom,
        attributes: {
          ...definition.root.dom.attributes,
          readonly: 'true',
          tabindex: '-1',
        },
      },
    },
  };
  return catalog;
}

describe('catalog inspector HTML attributes', () => {
  afterEach(cleanup);

  it('shows and commits HTML attributes through the current Properties tab', () => {
    const session = createEditorSession({ projectCatalog: catalogWithAttributeExample() });
    session.openAsset(definitionUuid);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });
    render(
      <CatalogNodeInspector
        model={app.getInspectorSidebarModel(rootUuid)}
        onEvent={(event) => void app.dispatchEditorEvent(event)}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Properties' }));
    expect(screen.queryByTestId('preview-options-disclosure')).toBeNull();
    const readonly = document.querySelector<HTMLInputElement>(
      'input[name="node.attributes.readonly"]',
    );
    const tabindex = document.querySelector<HTMLInputElement>(
      'input[name="node.attributes.tabindex"]',
    );
    expect(readonly?.value).toBe('true');
    expect(tabindex?.value).toBe('-1');

    fireEvent.change(tabindex!, { target: { value: '0' } });
    fireEvent.blur(tabindex!);

    expect(session.core.getSnapshot().openDefinition?.root.dom.attributes?.tabindex).toBe('0');
    session.destroy();
  });
});
