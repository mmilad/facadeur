import { describe, expect, it } from 'vitest';
import {
  CoreController,
  emptyProjectCatalog,
  resolveDefinitionToElementBuildConfig,
  previewFieldsForNode,
  inspectorInputsForNode,
  validateProjectCatalog,
  readTokenTree,
  type InspectorFormField,
} from '../src/index';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';

const atomUuid = exampleIds.components.image.definition;
const rootUuid = exampleIds.components.image.nodes.root;

function createControllerCatalog() {
  const catalog = createExampleCatalog();
  const image = catalog.atoms[atomUuid]!;
  return {
    ...catalog,
    atoms: {
      ...catalog.atoms,
      [atomUuid]: {
        ...image,
        config: {
          ...image.config,
          previewData: {
            fields: { src: 'https://example.test/a.png', alt: 'A', ratio: '1 / 1' },
          },
        },
      },
    },
  };
}

describe('CoreController', () => {
  it('answers Catalog and token queries through its controller API', () => {
    const catalog = createControllerCatalog();
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    const token = readTokenTree(catalog.tokens ?? {})
      .tokens.values()
      .next().value;

    expect(core.getDefinition(atomUuid)?.definition.name).toBe('Image');
    expect(core.getDefinitionDisplayName(atomUuid)).toBe('Image');
    expect(core.getDefinitionSummaries()).toContainEqual({
      uuid: atomUuid,
      name: 'Image',
      kind: 'atom',
    });
    expect(core.getEffectiveNodeTagName(rootUuid)).toBe('img');
    expect(core.getActiveBreakpoints().length).toBeGreaterThan(0);
    expect(token).toBeDefined();
    expect(core.getTokenByUUID(token!.uuid)?.uuid).toBe(token!.uuid);
    expect(core.getTokenByReference(`{token:${token!.uuid}}`)?.uuid).toBe(token!.uuid);
    expect(core.getTokenByReference('not-a-token')).toBeUndefined();
  });

  it('opens a definition and resolves preview fields', () => {
    const catalog = createControllerCatalog();
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    expect(core.getSnapshot().openDefinition?.name).toBe('Image');
    expect(core.node.config.previewFields(rootUuid).src).toBe('https://example.test/a.png');
    expect(core.node.schema.resolveForOpenDefinition()?.properties).toBeTruthy();
  });

  it('builds declarative element config for preview render', () => {
    const catalog = createControllerCatalog();
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    const config = core.node.element.buildOpenDefinition();
    expect(config?.tagName).toBe('img');
    expect(config?.attributes?.src).toBe('https://example.test/a.png');
    expect(config?.attributes?.alt).toBe('A');
  });

  it('patches instance data on the open definition', () => {
    const catalog = createControllerCatalog();
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    core.patchNodeField('src', 'https://example.test/b.png');
    expect(previewFieldsForNode(core.getSnapshot().openDefinition!, rootUuid).src).toBe(
      'https://example.test/b.png',
    );
    expect(
      resolveDefinitionToElementBuildConfig(
        core.getSnapshot().openDefinition!,
        core.getSnapshot().catalog,
      ).attributes?.src,
    ).toBe('https://example.test/b.png');
  });

  it('preserves the caller-specific empty-string behavior for preview defaults', () => {
    const core = new CoreController(createControllerCatalog());
    core.openDefinition(atomUuid);

    core.patchDefinitionPreviewField(atomUuid, 'alt', '');
    expect(core.getSnapshot().openDefinition?.config?.previewData?.fields?.alt).toBe('');

    core.applyInspectorFormChange({
      kind: 'previewField',
      definitionUuid: atomUuid,
      field: 'alt',
      value: '',
    });
    expect(core.getSnapshot().openDefinition?.config?.previewData?.fields?.alt).toBeUndefined();
  });

  it('prunes removed inline preview defaults and ignores invalid values during rendering', () => {
    const uuid = globalThis.crypto.randomUUID();
    const rootUuid = globalThis.crypto.randomUUID();
    const inline = {
      type: 'object',
      properties: {
        src: { type: 'string' },
        alt: { type: 'string' },
        ratio: { type: 'string' },
      },
    };
    const catalog = {
      ...emptyProjectCatalog(),
      atoms: {
        [uuid]: {
          uuid,
          name: 'Preview fixture',
          kind: 'atom' as const,
          schema: { kind: 'inline' as const, schema: inline },
          config: {
            previewData: { fields: { src: 'valid.png', alt: 'remove me', ratio: '1 / 1' } },
          },
          root: { uuid: rootUuid, dom: { tagName: 'div' } },
        },
      },
    };
    const core = new CoreController(catalog);
    core.openDefinition(uuid);
    core.patchDefinition('atoms', uuid, {
      schema: {
        kind: 'inline',
        schema: {
          type: 'object',
          properties: { src: { type: 'string' }, ratio: { type: 'string' } },
        },
      },
    });

    expect(core.getSnapshot().openDefinition?.config?.previewData?.fields).not.toHaveProperty(
      'alt',
    );
    const withInvalidPreview = {
      ...core.getSnapshot().catalog,
      atoms: {
        ...core.getSnapshot().catalog.atoms,
        [uuid]: {
          ...core.getSnapshot().catalog.atoms[uuid]!,
          config: {
            ...core.getSnapshot().catalog.atoms[uuid]!.config,
            previewData: { fields: { src: 42, ratio: '1 / 1', removed: 'stale' } },
          },
        },
      },
    };
    expect(() => validateProjectCatalog(withInvalidPreview)).not.toThrow();
    const rendered = resolveDefinitionToElementBuildConfig(
      withInvalidPreview.atoms[uuid]!,
      withInvalidPreview,
    );
    expect(rendered.attributes?.src).toBeUndefined();
    expect(rendered.attributes?.alt).toBeUndefined();
    expect(rendered.attributes?.['data-ratio']).toBeUndefined();
  });

  it('calculates inspector field defs and merged values', () => {
    const catalog = createControllerCatalog();
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    const inputs = inspectorInputsForNode(catalog, core.getSnapshot().openDefinition!, rootUuid);
    expect(inputs.fields.map((field) => field.name)).toEqual(['src', 'alt', 'ratio']);
    expect(inputs.values.src).toBe('https://example.test/a.png');
    expect(inputs.values.alt).toBe('A');
    expect(inputs.values.ratio).toBe('1 / 1');
    expect(core.node.config.inspectorInputs(rootUuid).values.src).toBe(
      'https://example.test/a.png',
    );
  });

  it('builds a schema-driven inspector form model with presets', () => {
    const catalog = createControllerCatalog();
    const core = new CoreController(catalog);
    core.openDefinition(atomUuid);
    const model = core.node.preview.inspectorForm(rootUuid);
    expect(model).not.toBeNull();
    expect(model!.formValue.definition.name).toBe('Image');
    expect(model!.formValue.node.tagName).toBe('img');
    const flat = flattenInspectorFields(model!.fields);
    expect(flat.some((field) => field.type === 'select' && field.path === 'node.tagName')).toBe(
      true,
    );
    expect(flat.some((field) => field.type === 'classList')).toBe(true);
    expect(
      flat.some((field) => field.type === 'schemaField' && field.path === 'nodeData.src'),
    ).toBe(true);
  });

  it('notifies subscribers after mutations', () => {
    const catalog = createControllerCatalog();
    const core = new CoreController(catalog);
    let count = 0;
    core.subscribe(() => {
      count += 1;
    });
    core.openDefinition(atomUuid);
    core.patchNodeField('alt', 'B');
    expect(count).toBe(2);
  });
});

function flattenInspectorFields(fields: InspectorFormField[]): InspectorFormField[] {
  return fields.flatMap((field) =>
    field.type === 'section' ? flattenInspectorFields(field.fields) : [field],
  );
}
