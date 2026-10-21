/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createEditorSession } from '../src/domain/session';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createAppService } from '../src/app-service';
import { CatalogNodeInspector } from '../src/ui/sidebar/right/components/CatalogNodeInspector';

const definitionUuid = exampleIds.components.input.definition;
const rootUuid = exampleIds.components.input.nodes.root;

function catalogWithPreviewFields() {
  const catalog = createExampleCatalog();
  const definition = catalog.components[definitionUuid];
  if (!definition) throw new Error('Expected the shared Input component example');

  catalog.components[definitionUuid] = {
    ...definition,
    schema: {
      kind: 'inline',
      schema: {
        type: 'object',
        properties: {
          label: { type: 'string', title: 'Label' },
          value: { type: 'string', title: 'Value' },
          placeholder: { type: 'string', title: 'Placeholder' },
        },
        additionalProperties: false,
      },
    },
    config: {
      ...definition.config,
      previewData: {
        fields: { label: 'Work emails', value: '', placeholder: 'Enter a valueasdasdasd' },
      },
    },
  };
  return catalog;
}

describe('catalog inspector preview fields', () => {
  afterEach(cleanup);

  it('edits a schema-backed preview default through the current inspector form', () => {
    const session = createEditorSession({ projectCatalog: catalogWithPreviewFields() });
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

    fireEvent.click(screen.getByRole('tab', { name: 'Preview data' }));
    const placeholder = screen.getByRole('textbox', { name: 'placeholder' });
    expect((placeholder as HTMLInputElement).value).toBe('Enter a valueasdasdasd');

    fireEvent.change(placeholder, { target: { value: 'Email address' } });
    fireEvent.blur(placeholder);

    expect(
      session.core.getSnapshot().openDefinition?.config?.previewData?.fields?.container
        ?.placeholder,
    ).toBe('Email address');
    session.destroy();
  });
});
