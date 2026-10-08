import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';
import {
  nodeDefinitionSchema,
  nodeSchema,
  projectCatalogSchema,
} from '../src/schema/node-model/index';

const imageSchemaUuid = '550e8400-e29b-41d4-a716-446655440001';
const imageAtomUuid = '550e8400-e29b-41d4-a716-446655440002';
const rootNodeUuid = '550e8400-e29b-41d4-a716-446655440003';

describe('node model contract', () => {
  it('accepts a minimal atom definition with dom.children and schema ref', () => {
    const catalog = {
      atoms: {
        [imageAtomUuid]: {
          uuid: imageAtomUuid,
          name: 'Image',
          kind: 'atom',
          schema: { kind: 'ref', uuid: imageSchemaUuid },
          config: {
            previewData: {
              fields: { src: 'x', alt: 'y', ratio: '16 / 9' },
            },
          },
          root: {
            uuid: rootNodeUuid,
            dom: {
              tagName: 'img',
              attributes: { src: '', alt: '' },
            },
          },
        },
      },
      components: {},
      pages: {},
      schemas: {
        [imageSchemaUuid]: {
          type: 'object',
          required: ['src'],
          properties: {
            src: { type: 'string' },
            alt: { type: 'string' },
            ratio: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    };

    expect(Value.Check(projectCatalogSchema, catalog)).toBe(true);
    expect(Value.Check(nodeDefinitionSchema, catalog.atoms[imageAtomUuid])).toBe(true);
  });

  it('accepts inline schema on a tree node', () => {
    const node = {
      uuid: rootNodeUuid,
      dom: { tagName: 'div' },
      schema: {
        kind: 'inline',
        schema: {
          type: 'object',
          properties: { title: { type: 'string' } },
          additionalProperties: false,
        },
      },
    };
    expect(Value.Check(nodeSchema, node)).toBe(true);
  });
});
