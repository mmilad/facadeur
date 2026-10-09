/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { definitionToElementBuildConfig } from '@facadeur/core';
import { buildElement } from '../src/build-element';
const testUuid30 = globalThis.crypto.randomUUID();
const testUuid31 = globalThis.crypto.randomUUID();
const testUuid32 = globalThis.crypto.randomUUID();

const schemaUuid = testUuid30;
const atomUuid = testUuid31;
const rootUuid = testUuid32;

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
    const config = definitionToElementBuildConfig(definition);
    const element = buildElement(config, { document });
    expect(element.tagName.toLowerCase()).toBe('img');
    expect(element.getAttribute('src')).toContain('placehold.co');
    expect(element.getAttribute('alt')).toBe('Preview image');
  });

  it('does not add text or children to void elements', () => {
    const element = buildElement(
      {
        tagName: 'img',
        text: 'ignored text',
        children: [{ tagName: 'span', text: 'ignored child' }],
      },
      { document },
    );

    expect(element.childNodes).toHaveLength(0);
  });
});
