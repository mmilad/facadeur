import { describe, expect, it } from 'vitest';
import {
  matchingChoice,
  previewControlsForUse,
  retargetControl,
  type ComponentSchemaUse,
  type NamedSchema,
} from '../src/domain/schema/schema-use';
import { schemaRefUri } from '../src/domain/schema/schema-validation';

const media: NamedSchema = {
  id: 'media',
  name: 'Media',
  schema: {
    title: 'Media',
    oneOf: [
      {
        title: 'Image',
        type: 'object',
        properties: {
          src: { type: 'string' },
          alt: { type: 'string' },
          ratio: { type: 'string' },
        },
      },
      {
        title: 'Video',
        type: 'object',
        properties: {
          src: { type: 'string' },
          poster: { type: 'string' },
          ratio: { type: 'string' },
        },
      },
    ],
  },
};

describe('schema use preview', () => {
  const use: ComponentSchemaUse = { direct: { kind: 'schema', schemaId: 'media' } };
  const [choice] = previewControlsForUse(use, [media]);

  it('keeps a video default on the video branch when both branches share src', () => {
    expect(choice?.kind).toBe('choice');
    expect(matchingChoice(choice!, { src: '', poster: '', ratio: '' })).toBe('1');
    expect(matchingChoice(choice!, { src: '', alt: '', ratio: '' })).toBe('0');
  });

  it('retargets nested array item paths', () => {
    const item = {
      path: 'tags.0',
      label: 'Item',
      kind: 'object' as const,
      children: [{ path: 'tags.0.name', label: 'Name', kind: 'string' as const }],
    };
    expect(retargetControl(item, 'tags.1').children?.[0]?.path).toBe('tags.1.name');
  });

  it('lists fields declared by an extending schema before inherited fields', () => {
    const inherited: NamedSchema = {
      id: 'inherited',
      name: 'Inherited',
      schema: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          disabled: { type: 'boolean' },
        },
      },
    };
    const extended: NamedSchema = {
      id: 'extended',
      name: 'Extended',
      schema: {
        type: 'object',
        allOf: [{ $ref: schemaRefUri(inherited.id) }],
        properties: { label: { type: 'string' } },
      },
    };

    const controls = previewControlsForUse({ direct: { kind: 'schema', schemaId: extended.id } }, [
      inherited,
      extended,
    ]);

    expect(controls.map((field) => field.path)).toEqual(['label', 'value', 'disabled']);
  });
});
