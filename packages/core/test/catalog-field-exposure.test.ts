import { describe, expect, it } from 'vitest';
import type {
  FieldExposure,
  FieldValue,
  Node,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import { createExampleCatalog, exampleIds, image as exampleImage } from '@facadeur/examples';
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
  it('resolves state-backed repeater rows and keeps an empty-state template for codegen', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const rowUuid = globalThis.crypto.randomUUID();
    const row: Node = { uuid: rowUuid, dom: { tagName: 'span', text: '{item}' } };
    Reflect.set(component.root, 'config', {
      composition: { kind: 'repeater', source: { kind: 'state', name: 'items' } },
    });
    Reflect.set(component.root.dom, 'children', [row]);
    Reflect.set(component, 'behavior', {
      state: { items: [] },
      stateSchema: { items: { type: 'array', items: { type: 'string' } } },
      transitions: [],
    });

    expect(() => validateProjectCatalog(catalog)).not.toThrow();
    const empty = resolveDefinitionToElementBuildConfig(component, catalog);
    expect(empty.kind).toBe('fragment');
    expect(empty.kind === 'fragment' ? empty.children : undefined).toBeUndefined();
    expect(empty.kind === 'fragment' ? empty.repeater?.templates : undefined).toHaveLength(1);

    Reflect.set(component, 'behavior', {
      state: { items: ['One', 'Two'] },
      stateSchema: { items: { type: 'array', items: { type: 'string' } } },
      transitions: [],
    });
    const populated = resolveDefinitionToElementBuildConfig(component, catalog);
    expect(
      populated.kind === 'fragment' ? populated.children?.map((child) => child.text) : [],
    ).toEqual(['One', 'Two']);
  });

  it('uses a configured object field as stable preview row identity', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const row: Node = { uuid: globalThis.crypto.randomUUID(), dom: { tagName: 'span' } };
    Reflect.set(component.root, 'config', {
      composition: { kind: 'repeater', source: { kind: 'state', name: 'items' } },
    });
    Reflect.set(component.root.dom, 'children', [row]);
    Reflect.set(component, 'behavior', {
      state: { items: [{ id: 'stable-a' }, { id: 'stable-b' }] },
      stateSchema: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
          },
        },
      },
      stateArrayKeyPaths: { items: 'id' },
      transitions: [],
    });

    expect(() => validateProjectCatalog(catalog)).not.toThrow();
    const preview = resolveDefinitionToElementBuildConfig(component, catalog);
    expect(
      preview.kind === 'fragment' ? preview.children?.map((child) => child.renderKey) : [],
    ).toEqual([`${row.uuid}:stable-a:0`, `${row.uuid}:stable-b:0`]);
  });
  it('evaluates class conditions against private component state defaults', () => {
    const original = exampleImage;
    const catalog = {
      ...createExampleCatalog(),
      atoms: { ...createExampleCatalog().atoms, [original.uuid]: original },
    };
    const definition: NodeDefinition = {
      ...original,
      behavior: { state: { open: true }, transitions: [] },
      root: {
        ...original.root,
        classes: [
          {
            name: 'is-open',
            condition: {
              kind: 'condition',
              left: { kind: 'reference', reference: '{state:open}' },
              operator: 'equals',
              right: { kind: 'literal', value: true },
            },
          },
        ],
      },
    };
    const resolved = resolveDefinitionToElementBuildConfig(definition, catalog);
    expect(resolved.attributes?.class).toContain('is-open');
  });

  it('isolates behavior state for two references to the same embedded definition', () => {
    const childId = testUuid12;
    const firstRefId = testUuid13;
    const secondRefId = testUuid14;
    const embedded: NodeDefinition = {
      uuid: childId,
      name: 'Disclosure',
      kind: 'component',
      schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
      behavior: {
        state: { open: false },
        transitions: [{ nodeUuid: testUuid15, event: 'click', actions: [] }],
      },
      root: {
        uuid: testUuid10,
        dom: { tagName: 'section', children: [{ uuid: testUuid15, dom: { tagName: 'button' } }] },
        classes: [
          {
            name: 'is-open',
            condition: {
              kind: 'condition',
              left: { kind: 'reference', reference: '{state:open}' },
              operator: 'equals',
              right: { kind: 'literal', value: true },
            },
          },
        ],
      },
    };
    const parent: NodeDefinition = {
      uuid: cardId,
      name: 'Two disclosures',
      kind: 'component',
      schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
      root: {
        uuid: testUuid11,
        dom: {
          tagName: 'main',
          children: [
            { uuid: firstRefId, dom: { tagName: 'div' }, config: { definitionRef: childId } },
            { uuid: secondRefId, dom: { tagName: 'div' }, config: { definitionRef: childId } },
          ],
        },
      },
    };
    const catalog = {
      ...createExampleCatalog(),
      components: { ...createExampleCatalog().components, [childId]: embedded, [cardId]: parent },
    };
    const firstScope = `${parent.uuid}/${parent.root.uuid}/${firstRefId}`;
    const secondScope = `${parent.uuid}/${parent.root.uuid}/${secondRefId}`;

    const resolved = resolveDefinitionToElementBuildConfig(
      parent,
      catalog,
      {},
      {
        includeBehaviorTargets: true,
        behaviorStateByInstance: { [firstScope]: { open: true } },
      },
    );

    expect(resolved.kind).toBeUndefined();
    if (resolved.kind === 'fragment') throw new Error('Expected a DOM element');
    const [first, second] = resolved.children ?? [];
    if (!first || first.kind === 'fragment' || !second || second.kind === 'fragment') {
      throw new Error('Expected embedded DOM elements');
    }
    expect(first.attributes?.class).toContain('is-open');
    expect(second.attributes?.class ?? '').not.toContain('is-open');
    const firstButton = first.children?.[0];
    const secondButton = second.children?.[0];
    if (
      !firstButton ||
      firstButton.kind === 'fragment' ||
      !secondButton ||
      secondButton.kind === 'fragment'
    ) {
      throw new Error('Expected embedded behavior buttons');
    }
    expect(firstButton.behaviorTargets?.[0]).toMatchObject({
      scopeKey: firstScope,
      definitionUuid: childId,
      nodeUuid: testUuid15,
      events: ['click'],
    });
    expect(secondButton.behaviorTargets?.[0]?.scopeKey).toBe(secondScope);
    const normalPreview = resolveDefinitionToElementBuildConfig(parent, catalog);
    if (normalPreview.kind === 'fragment') throw new Error('Expected a normal DOM element');
    expect(
      normalPreview.children?.[0]?.kind === 'fragment'
        ? undefined
        : normalPreview.children?.[0]?.behaviorTargets,
    ).toBeUndefined();
  });

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

  it('shows inherited fields in Preview Data and stores the group name on the root instance config', () => {
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
    const instanceFields = rootModel.configFields.filter(
      (field) => field.instanceUuid === instanceUuid,
    );
    expect(instanceFields.length).toBeGreaterThan(0);
    expect(instanceFields[0]?.exposure).toEqual({ mode: 'grouped', groupName: 'hero-media' });
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
    core.node.preview.applyFormChange(
      `definition.fieldExposure.${testUuid11}.mode`,
      'manual',
      testUuid10,
    );

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
