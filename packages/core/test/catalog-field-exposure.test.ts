import { describe, expect, it } from 'vitest';
import type { FieldExposure, FieldValue, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { effectiveSchemaForDefinition } from '../src/controller/project/catalog/field-contract';
import { buildInspectorFormModel } from '../src/controller/project/node/preview/inspector-view';
import { resolveDefinitionToElementBuildConfig } from '../src/controller/project/node/preview/resolve';
import { validateProjectCatalog } from '../src/controller/project/catalog/validate';

const imageId = '10000000-0000-4000-8000-000000000001';
const cardId = '10000000-0000-4000-8000-000000000002';
const imageNodeId = '10000000-0000-4000-8000-000000000003';

function catalogWith(
  exposure: FieldExposure,
  imageInstanceExposure?: FieldExposure,
  previewData: Record<string, FieldValue> = {},
): ProjectCatalog {
  const image: NodeDefinition = {
    uuid: imageId,
    name: 'Image',
    kind: 'atom',
    schema: {
      kind: 'inline',
      schema: {
        type: 'object',
        required: ['src'],
        properties: {
          src: { type: 'string', default: 'asset-src' },
          alt: { type: 'string' },
          ratio: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    config: {
      fieldExposure: exposure,
      previewData: { fields: { src: 'asset-src', alt: 'asset-alt' } },
    },
    root: {
      uuid: imageNodeId,
      dom: { tagName: 'img', attributes: { src: 'fallback-src', alt: 'fallback-alt' } },
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
    config: { previewData: { fields: previewData } },
    root: {
      uuid: '10000000-0000-4000-8000-000000000004',
      dom: {
        tagName: 'article',
        children: [
          {
            uuid: '10000000-0000-4000-8000-000000000005',
            name: 'hero-media',
            dom: { tagName: 'div' },
            config: {
              definitionRef: imageId,
              ...(imageInstanceExposure ? { fieldExposure: imageInstanceExposure } : {}),
            },
          },
        ],
      },
    },
  };
  return { atoms: { [imageId]: image }, components: { [cardId]: card }, pages: {} };
}

describe('catalog field exposure', () => {
  it('adds nested fields and target preview defaults to the flat public contract', () => {
    const catalog = catalogWith({ mode: 'flat' });
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

  it('groups target fields under the instance name and lets the instance override the atom default', () => {
    const catalog = catalogWith({ mode: 'grouped' });
    const card = catalog.components[cardId]!;
    const grouped = effectiveSchemaForDefinition(catalog, card);
    expect(Object.keys(grouped.schema?.properties as Record<string, unknown>)).toEqual([
      'eyebrow',
      'hero-media',
    ]);
    expect(grouped.previewDefaults['hero-media']).toEqual({ src: 'asset-src', alt: 'asset-alt' });

    const override = catalogWith({ mode: 'grouped' }, { mode: 'flat' });
    expect(
      Object.keys(
        effectiveSchemaForDefinition(override, override.components[cardId]!).schema
          ?.properties as Record<string, unknown>,
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
      { mode: 'flat' },
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
      uuid: '10000000-0000-4000-8000-000000000006',
      name: 'Image source',
      value: 'bound-prop-src',
    };
    const base = catalogWith({ mode: 'flat' });
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
      { mode: 'flat' },
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

  it('rejects recursive catalog composition', () => {
    const cyclic = catalogWith({ mode: 'flat' });
    const image = cyclic.atoms[imageId]!;
    (image.root.dom as { tagName: string; children?: (typeof image.root)[] }).children = [
      {
        uuid: '10000000-0000-4000-8000-000000000006',
        dom: { tagName: 'div' },
        config: { definitionRef: imageId },
      },
    ];
    expect(() => validateProjectCatalog(cyclic)).toThrow(/Cyclic catalog definition reference/);
  });
});
