import { describe, expect, it } from 'vitest';
import type {
  FieldExposure,
  FieldValue,
  Node,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { effectiveSchemaForDefinition } from '../src/controller/project/catalog/field-contract';
import { CoreController } from '../src/controller/project/controller';
import { buildInspectorFormModel } from '../src/controller/project/node/preview/inspector-view';
import { resolveDefinitionToElementBuildConfig } from '../src/controller/project/node/preview/resolve';
import { validateProjectCatalog } from '../src/controller/project/catalog/validate';
const testUuid8 = globalThis.crypto.randomUUID();
const testUuid10 = globalThis.crypto.randomUUID();
const testUuid11 = globalThis.crypto.randomUUID();
const testUuid12 = globalThis.crypto.randomUUID();
const testUuid13 = globalThis.crypto.randomUUID();
const testUuid14 = globalThis.crypto.randomUUID();
const testUuid15 = globalThis.crypto.randomUUID();

const imageId = exampleIds.components.image.definition;
const cardId = testUuid8;

function catalogWith(
  exposure?: FieldExposure,
  previewData: Record<string, FieldValue> = {},
): ProjectCatalog {
  const catalog = createExampleCatalog();
  const image = catalog.atoms[imageId]!;
  const imageWithDefaults: NodeDefinition = {
    ...image,
    config: {
      ...image.config,
      previewData: { fields: { src: 'asset-src', alt: 'asset-alt' } },
    },
  };
  const card: NodeDefinition = {
    uuid: cardId,
    name: 'Card',
    kind: 'component',
    schema: {
      kind: 'inline',
      schema: {
        type: 'object',
        properties: { eyebrow: { type: 'string' } },
        additionalProperties: false,
      },
    },
    config: {
      previewData: { fields: previewData },
      ...(exposure ? { fieldExposure: { [testUuid11]: exposure } } : {}),
    },
    root: {
      uuid: testUuid10,
      dom: {
        tagName: 'article',
        children: [
          {
            uuid: testUuid11,
            name: 'hero-media',
            dom: { tagName: 'div' },
            config: { definitionRef: imageId },
          },
        ],
      },
    },
  };
  return {
    ...catalog,
    atoms: { ...catalog.atoms, [imageId]: imageWithDefaults },
    components: { ...catalog.components, [cardId]: card },
  };
}

describe('catalog field exposure', () => {
  it('adds nested fields and target preview defaults to the flat public contract', () => {
    const catalog = catalogWith();
    const card = catalog.components[cardId]!;
    const effective = effectiveSchemaForDefinition(catalog, card);

    expect(Object.keys(effective.schema?.properties as Record<string, unknown>)).toEqual([
      'eyebrow',
      'src',
      'alt',
      'ratio',
    ]);
    expect(effective.previewDefaults).toMatchObject({ src: 'asset-src', alt: 'asset-alt' });
    expect(effective.origins.get('src')).toMatchObject({
      kind: 'inherited',
      instanceName: 'hero-media',
      definitionName: 'Image',
    });
  });

  it('groups target fields under the instance name when configured on the parent definition', () => {
    const catalog = catalogWith({ mode: 'grouped' });
    const card = catalog.components[cardId]!;
    const grouped = effectiveSchemaForDefinition(catalog, card);
    expect(Object.keys(grouped.schema?.properties as Record<string, unknown>)).toEqual([
      'eyebrow',
      'hero-media',
    ]);
    expect(grouped.previewDefaults['hero-media']).toEqual({ src: 'asset-src', alt: 'asset-alt' });

    const flat = catalogWith({ mode: 'flat' });
    expect(
      Object.keys(
        effectiveSchemaForDefinition(flat, flat.components[cardId]!).schema?.properties as Record<
          string,
          unknown
        >,
      ),
    ).toEqual(['eyebrow', 'src', 'alt', 'ratio']);
  });

  it('shows inherited fields in Preview Data and exposes the editable group name on the instance', () => {
    const catalog = catalogWith({ mode: 'grouped' });
    const card = catalog.components[cardId]!;
    const rootModel = buildInspectorFormModel(catalog, card, card.root.uuid)!;
    const previewSection = rootModel.fields.find(
      (field) => field.type === 'section' && field.title === 'Preview defaults',
    );
    expect(
      previewSection?.type === 'section' &&
        previewSection.fields.map((field) =>
          field.type === 'schemaField' ? field.field.name : '',
        ),
    ).toContain('hero-media');

    const instanceUuid = card.root.dom.children?.[0]?.uuid;
    const instanceModel = buildInspectorFormModel(catalog, card, instanceUuid!)!;
    expect(instanceModel.formValue.previewData).toEqual({ src: 'asset-src', alt: 'asset-alt' });
    expect(Object.keys(instanceModel.formValue.nodeData)).toEqual(['src', 'alt', 'ratio']);
    const elementSection = instanceModel.fields.find(
      (field) => field.type === 'section' && field.title === 'Element',
    );
    expect(
      elementSection?.type === 'section' &&
        elementSection.fields.map((field) => (field.type === 'text' ? field.path : '')),
    ).toContain('node.fieldExposure.groupName');
    expect(instanceModel.formValue.node.fieldExposureGroupName).toBe('hero-media');
  });

  it('maps manual aliases into the public contract and resolves the value on the referenced atom', () => {
    const catalog = catalogWith(
      { mode: 'manual', fields: { src: 'eyebrow' } },
      { eyebrow: 'Bound by the parent' },
    );
    const card = catalog.components[cardId]!;
    const effective = effectiveSchemaForDefinition(catalog, card);
    expect(Object.keys(effective.schema?.properties as Record<string, unknown>)).toEqual([
      'eyebrow',
    ]);
    expect(effective.previewDefaults.eyebrow).toBe('Bound by the parent');
    expect(
      resolveDefinitionToElementBuildConfig(card, catalog).children?.[0]?.attributes?.src,
    ).toBe('Bound by the parent');
  });

  it('resolves an atom prop binding unless a parent field is explicitly mapped over it', () => {
    const prop = {
      uuid: testUuid12,
      name: 'Image source',
      value: 'bound-prop-src',
    };
    const base = catalogWith();
    const image = base.atoms[imageId]!;
    (image.root.dom as { tagName: string; attributes?: Record<string, string> }).attributes = {
      src: `{prop:${prop.uuid}}`,
    };
    const catalog: ProjectCatalog = { ...base, props: { [prop.uuid]: prop } };
    expect(
      resolveDefinitionToElementBuildConfig(catalog.components[cardId]!, catalog).children?.[0]
        ?.attributes?.src,
    ).toBe('bound-prop-src');

    const overrideBase = catalogWith(
      { mode: 'manual', fields: { src: 'eyebrow' } },
      { eyebrow: 'Parent supplied source' },
    );
    const overrideImage = overrideBase.atoms[imageId]!;
    (
      overrideImage.root.dom as { tagName: string; attributes?: Record<string, string> }
    ).attributes = {
      src: `{prop:${prop.uuid}}`,
    };
    const overrideCatalog: ProjectCatalog = { ...overrideBase, props: { [prop.uuid]: prop } };
    expect(
      resolveDefinitionToElementBuildConfig(overrideCatalog.components[cardId]!, overrideCatalog)
        .children?.[0]?.attributes?.src,
    ).toBe('Parent supplied source');
  });

  it('resolves text content through stable component prop ids', () => {
    const titlePropId = testUuid13;
    const definition: NodeDefinition = {
      uuid: cardId,
      name: 'Card',
      kind: 'component',
      schema: {
        kind: 'inline',
        schema: {
          type: 'object',
          properties: { title: { type: 'string', 'x-facadeur-prop-id': titlePropId } },
          additionalProperties: false,
        },
      },
      config: { previewData: { fields: { title: 'Bound title' } } },
      root: {
        uuid: testUuid14,
        dom: {
          tagName: 'article',
          children: [
            {
              uuid: testUuid15,
              dom: { tagName: 'h2', text: `{props:${titlePropId}}` },
            },
          ],
        },
      },
    };
    const catalog: ProjectCatalog = { atoms: {}, components: { [cardId]: definition }, pages: {} };
    const model = buildInspectorFormModel(catalog, definition, definition.root.uuid)!;
    const contentSection = model.fields.find(
      (field) => field.type === 'section' && field.title === 'Content',
    );

    expect(contentSection).toMatchObject({
      type: 'section',
      fields: [{ type: 'text', path: 'node.text', bindable: true }],
    });
    expect(resolveDefinitionToElementBuildConfig(definition, catalog).children?.[0]?.text).toBe(
      'Bound title',
    );

    const core = new CoreController(catalog);
    core.openDefinition(cardId);
    core.node.preview.applyFormChange('node.text', `{props:${titlePropId}}`, testUuid15);
    expect(core.getSnapshot().openDefinition?.root.dom.children?.[0]?.dom.text).toBe(
      `{props:${titlePropId}}`,
    );
    expect(core.node.element.buildOpenDefinition()?.children?.[0]?.text).toBe('Bound title');
  });

  it('rejects recursive catalog composition', () => {
    const cyclic = catalogWith();
    const image = cyclic.atoms[imageId]!;
    (image.root.dom as { tagName: string; children?: (typeof image.root)[] }).children = [
      {
        uuid: testUuid12,
        dom: { tagName: 'div' },
        config: { definitionRef: imageId },
      },
    ];
    expect(() => validateProjectCatalog(cyclic)).toThrow(/Cyclic catalog definition reference/);
  });

  it('configures two instances independently from the parent definition', () => {
    const catalog = catalogWith({ mode: 'grouped' });
    const card = catalog.components[cardId]!;
    const first = card.root.dom.children?.[0];
    if (!first) throw new Error('Expected the card to contain an image instance');
    const second: Node = { ...first, uuid: testUuid13, name: 'secondary-image' };
    const parent: NodeDefinition = {
      ...card,
      config: {
        ...card.config,
        fieldExposure: {
          [first.uuid]: { mode: 'grouped', groupName: 'hero-media' },
          [second.uuid]: { mode: 'manual', fields: { alt: 'secondaryAlt' } },
        },
      },
      root: {
        ...card.root,
        dom: { ...card.root.dom, children: [first, second] },
      },
    };
    const withTwoInstances = {
      ...catalog,
      components: { ...catalog.components, [cardId]: parent },
    };

    const effective = effectiveSchemaForDefinition(withTwoInstances, parent);
    expect(Object.keys(effective.schema?.properties as Record<string, unknown>)).toEqual([
      'eyebrow',
      'hero-media',
      'secondaryAlt',
    ]);
    expect(effective.origins.get('secondaryAlt')).toMatchObject({
      kind: 'inherited',
      instanceUuid: second.uuid,
      fieldName: 'alt',
    });
    expect(() => validateProjectCatalog(withTwoInstances)).not.toThrow();
  });

  it('moves legacy node exposure to its parent map and ignores old definition defaults', () => {
    const catalog = catalogWith();
    const card = catalog.components[cardId]!;
    const instance = card.root.dom.children?.[0];
    if (!instance) throw new Error('Expected the card to contain an image instance');
    const legacyInstance = {
      ...instance,
      config: {
        ...instance.config,
        fieldExposure: { mode: 'manual', fields: { src: 'eyebrow' } },
      },
      dom: {
        ...instance.dom,
        children: [
          {
            uuid: testUuid14,
            dom: { tagName: 'span' },
            config: { fieldExposure: { mode: 'grouped' } },
          },
        ],
      },
    } as unknown as Node;
    const legacyCard: NodeDefinition = {
      ...card,
      root: {
        ...card.root,
        dom: { ...card.root.dom, children: [legacyInstance] },
      },
    };
    const image = catalog.atoms[imageId]!;
    const legacyImage = {
      ...image,
      config: {
        ...image.config,
        fieldExposure: { mode: 'grouped', groupName: 'legacy-default' },
      },
    } as unknown as NodeDefinition;
    const legacyCatalog = {
      ...catalog,
      atoms: { ...catalog.atoms, [imageId]: legacyImage },
      components: { ...catalog.components, [cardId]: legacyCard },
    };

    const normalized = validateProjectCatalog(legacyCatalog);
    expect(normalized.components[cardId]!.config?.fieldExposure).toEqual({
      [instance.uuid]: { mode: 'manual', fields: { src: 'eyebrow' } },
    });
    expect(normalized.components[cardId]!.root.dom.children?.[0]?.config).toEqual({
      definitionRef: imageId,
    });
    expect(
      normalized.components[cardId]!.root.dom.children?.[0]?.dom.children?.[0]?.config,
    ).toBeUndefined();
    expect(normalized.atoms[imageId]!.config?.fieldExposure).toBeUndefined();
    expect(
      Object.keys(
        effectiveSchemaForDefinition(normalized, normalized.components[cardId]!).schema
          ?.properties as Record<string, unknown>,
      ),
    ).toEqual(['eyebrow']);
  });

  it('writes Inspector exposure changes to the open definition by instance UUID', () => {
    const catalog = catalogWith();
    const core = new CoreController(catalog);
    core.openDefinition(cardId);
    core.node.preview.applyFormChange('node.fieldExposure.mode', 'manual', testUuid11);

    const updated = core.getSnapshot().openDefinition!;
    expect(updated.config?.fieldExposure?.[testUuid11]).toEqual({ mode: 'manual', fields: {} });
    expect(updated.root.dom.children?.[0]?.config).toEqual({ definitionRef: imageId });
  });

  it('rejects parent exposure entries that do not target an embedded definition node', () => {
    const catalog = catalogWith();
    const card = catalog.components[cardId]!;
    const invalid: ProjectCatalog = {
      ...catalog,
      components: {
        ...catalog.components,
        [cardId]: {
          ...card,
          config: { ...card.config, fieldExposure: { [card.root.uuid]: { mode: 'flat' } } },
        },
      },
    };

    expect(() => validateProjectCatalog(invalid)).toThrow(
      /Field exposure requires a definition instance/,
    );
  });
});
