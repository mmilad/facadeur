import { describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../src/domain/session';
import { EditorEventType } from '../src/domain/sidebar/events';

describe('sidebar view-model adapter', () => {
  it('maps the canonical Example Catalog into asset, layer, and inspector UI models', () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    session.openAsset(exampleIds.components.card.definition);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });
    const snapshot = app.getSnapshot();
    const project = snapshot.sidebar.project;
    const card = project.assets.find((asset) => asset.id === exampleIds.components.card.definition);
    const layers = snapshot.sidebar.layers.layers;

    expect(card).toMatchObject({ label: 'Card', kind: 'component' });
    expect(project.draggableAssetIds).toContain(exampleIds.components.button.definition);
    expect(layers?.children.map((item) => item.label)).toEqual(
      expect.arrayContaining(['eyebrow', 'title', 'body']),
    );
    expect(snapshot.sidebar.inspector?.nodeId).toBe(exampleIds.components.card.nodes.root);
    expect(snapshot.sidebar.inspector?.tabs.map((tab) => tab.label)).toEqual(
      expect.arrayContaining(['Style', 'Properties']),
    );
    session.destroy();
  });

  it('keeps internal state in the condition options when the component has no props', async () => {
    const catalog = createExampleCatalog();
    const component = catalog.components[exampleIds.components.card.definition]!;
    const noProps = {
      ...component,
      schema: {
        kind: 'inline' as const,
        schema: { type: 'object', properties: {}, additionalProperties: false },
      },
      behavior: { state: { open: true }, transitions: [] },
      root: {
        ...component.root,
        classes: [{ name: 'is-open' }],
      },
    };
    const session = createEditorSession({
      projectCatalog: {
        ...catalog,
        components: { ...catalog.components, [noProps.uuid]: noProps },
      },
    });
    session.openAsset(noProps.uuid);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });

    const conditionOptions = app.getSnapshot().sidebar.inspector?.layerStyles[0]?.conditionOptions;
    expect(conditionOptions).toContainEqual({
      value: '{state:open}',
      label: 'State: open',
      valueType: 'boolean',
    });
    await app.dispatchEditorEvent({
      type: EditorEventType.DesignCommandExecute,
      data: {
        command: {
          type: 'setNodeClassCondition',
          definitionUuid: noProps.uuid,
          nodeUuid: noProps.root.uuid,
          className: 'is-open',
          condition: {
            kind: 'condition',
            left: { kind: 'reference', reference: '{state:open}' },
            operator: 'equals',
            right: { kind: 'literal', value: true },
          },
        },
      },
    });
    expect(
      app.getSnapshot().sidebar.inspector?.layerStyles.find((item) => item.className === 'is-open')
        ?.condition,
    ).toMatchObject({
      kind: 'condition',
    });
    session.destroy();
  });

  it('keeps the generated root class first and reorders optional classes through design commands', async () => {
    const catalog = createExampleCatalog();
    const component = catalog.components[exampleIds.components.card.definition]!;
    const generated = component.root.classes?.find((item) => item.generated);
    if (!generated) throw new Error('Expected the card root to have a generated class');
    const definition = {
      ...component,
      root: {
        ...component.root,
        classes: [{ name: 'first' }, { name: 'second' }, generated],
      },
    };
    const session = createEditorSession({
      projectCatalog: {
        ...catalog,
        components: { ...catalog.components, [definition.uuid]: definition },
      },
    });
    session.openAsset(definition.uuid);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });

    expect(
      app.getSnapshot().sidebar.inspector?.layerStyles.map((style) => style.className),
    ).toEqual([generated.name, 'first', 'second']);
    await app.dispatchEditorEvent({
      type: EditorEventType.DesignCommandExecute,
      data: {
        command: {
          type: 'setNodeClassOrder',
          definitionUuid: definition.uuid,
          nodeUuid: definition.root.uuid,
          classNames: ['second', 'first'],
        },
      },
    });

    expect(
      app.getSnapshot().sidebar.inspector?.layerStyles.map((style) => style.className),
    ).toEqual([generated.name, 'second', 'first']);
    expect(
      session.core.getSnapshot().catalog.components[definition.uuid]?.root.classes?.at(-1)
        ?.generated,
    ).toBe(true);
    session.destroy();
  });
});
