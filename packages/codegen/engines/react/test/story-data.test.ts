import { describe, expect, it } from 'vitest';
import type { JsonSchema } from '@facadeur/core';
import { typedStoryValue } from '../src/story-data';
import { generateReact } from '../src/index';
import type { DocumentFile } from '@facadeur/core';

const branches: JsonSchema = {
  anyOf: ['card', 'textarea'].map((type) => ({
    type: 'object',
    required: ['type', 'props'],
    additionalProperties: false,
    properties: {
      type: { const: type },
      props: {
        type: 'object',
        properties: type === 'card' ? { title: { type: 'string' } } : { value: { type: 'string' } },
        additionalProperties: false,
      },
    },
  })),
};

describe('generated story structural data', () => {
  it('normalizes base and named variant samples with placement-specific cases', () => {
    const leaf: DocumentFile = {
      version: 1,
      id: 'story-card',
      name: 'Card',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', required: true }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'title', target: 'text' }] },
    };
    const section: DocumentFile = {
      version: 1,
      id: 'story-section',
      name: 'Section',
      kind: 'section',
      variants: [{ name: 'default' }, { name: 'compact' }],
      root: {
        id: 'root',
        type: 'repeater',
        children: [{ id: 'card', type: 'instance', component: leaf.id, switchCase: 'custom' }],
      },
      previewData: {
        fields: { items: [{ title: 'Base' }] },
        variants: {
          compact: { items: [{ type: 'custom', props: { title: 'Compact' } }] },
        },
      },
    };
    const original = structuredClone(section);
    const generated = generateReact({ documents: [section, leaf] });
    const story = generated.stories.find((file) =>
      file.path.endsWith('/StorySection.stories.tsx'),
    )!.contents;
    expect(story).toContain('items: [{"type":"custom","props":{"title":"Base"}}]');
    expect(story).toContain('items: [{"type":"custom","props":{"title":"Compact"}}]');
    expect(section).toEqual(original);
  });

  it('wraps legacy samples and retains tagged choices without mutating source data', () => {
    const value = [{ title: 'Card' }, { value: '' }, { type: 'textarea', props: {} }];
    const before = structuredClone(value);
    expect(typedStoryValue(value, { type: 'array', items: branches })).toEqual([
      { type: 'card', props: { title: 'Card' } },
      { type: 'textarea', props: { value: '' } },
      { type: 'textarea', props: {} },
    ]);
    expect(value).toEqual(before);
  });

  it('normalizes nested item arrays inside component payloads', () => {
    const schema: JsonSchema = {
      anyOf: [
        {
          type: 'object',
          properties: {
            type: { const: 'group' },
            props: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                items: { type: 'array', items: branches },
              },
            },
          },
          required: ['type', 'props'],
          additionalProperties: false,
        },
      ],
    };
    expect(typedStoryValue({ title: 'Group', items: [{ title: 'Nested' }] }, schema)).toEqual({
      type: 'group',
      props: { title: 'Group', items: [{ type: 'card', props: { title: 'Nested' } }] },
    });
  });

  it('rejects unmatched cases instead of emitting invalid typed samples', () => {
    expect(() => typedStoryValue({ type: 'missing', props: {} }, branches)).toThrow(
      'does not match',
    );
  });
});
