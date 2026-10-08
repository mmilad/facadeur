import type { NodeDefinitionModel, ProjectCatalogModel } from '@facadeur/core';
import { createProjectTemplate } from '@facadeur/tokens';

/** Stable ids for starter catalog entries (rename display names freely). */
export const IMAGE_SCHEMA_UUID = '550e8400-e29b-41d4-a716-446655440001';
export const IMAGE_ATOM_UUID = '550e8400-e29b-41d4-a716-446655440002';
export const IMAGE_ROOT_UUID = '550e8400-e29b-41d4-a716-446655440003';

export function imageAtomDefinition(): NodeDefinitionModel {
  return {
    uuid: IMAGE_ATOM_UUID,
    name: 'Image',
    kind: 'atom',
    schema: { kind: 'ref', uuid: IMAGE_SCHEMA_UUID },
    root: {
      uuid: IMAGE_ROOT_UUID,
      dom: {
        tagName: 'img',
        attributes: { src: '', alt: '' },
      },
    },
    config: {
      previewData: {
        fields: {
          src: 'https://placehold.co/400x300',
          alt: 'Preview image',
          ratio: '4 / 3',
        },
      },
    },
  };
}

export function seedProjectCatalog(): ProjectCatalogModel {
  const template = createProjectTemplate();
  return {
    atoms: { [IMAGE_ATOM_UUID]: imageAtomDefinition() },
    components: {},
    pages: {},
    tokens: template.tokens,
    fonts: template.fonts,
    globalStyles: { breakpoints: template.breakpoints },
    schemas: {
      [IMAGE_SCHEMA_UUID]: {
        type: 'object',
        title: 'Image',
        required: ['src'],
        properties: {
          src: { type: 'string', title: 'Source' },
          alt: { type: 'string', title: 'Alt text' },
          ratio: { type: 'string', title: 'Ratio' },
        },
        additionalProperties: false,
      },
    },
  };
}
