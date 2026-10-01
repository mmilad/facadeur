import { describe, expect, it } from 'vitest';
import {
  matchingChoice,
  previewControlsForUse,
  retargetControl,
  type ComponentSchemaUse,
  type NamedSchema,
} from '../src/domain/schema-use.js';

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
});
