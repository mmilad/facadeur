import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { definitionToElementBuildConfig } from '@facadeur/core';
import { buildElement } from '../src/build-element';

const schemaUuid = '550e8400-e29b-41d4-a716-446655440001';
const atomUuid = '550e8400-e29b-41d4-a716-446655440002';
const rootUuid = '550e8400-e29b-41d4-a716-446655440003';

const definition = {
  uuid: atomUuid,
  name: 'Image',
  kind: 'atom' as const,
  schema: { kind: 'ref' as const, uuid: schemaUuid },
  config: {
    previewData: {
      fields: {
        src: 'https://placehold.co/400x300',
        alt: 'Preview image',
        ratio: '4 / 3',
      },
    },
  },
  root: {
    uuid: rootUuid,
    dom: { tagName: 'img', attributes: { src: '', alt: '' } },
  },
};

describe('buildElement preview pipeline', () => {
  it('renders image atom from ElementBuildConfig', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const config = definitionToElementBuildConfig(definition);
    const element = buildElement(config, { document: dom.window.document });
    expect(element.tagName.toLowerCase()).toBe('img');
    expect(element.getAttribute('src')).toContain('placehold.co');
    expect(element.getAttribute('alt')).toBe('Preview image');
  });

  it('does not add text or children to void elements', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const element = buildElement(
      {
        tagName: 'img',
        text: 'ignored text',
        children: [{ tagName: 'span', text: 'ignored child' }],
      },
      { document: dom.window.document },
    );

    expect(element.childNodes).toHaveLength(0);
  });
});
