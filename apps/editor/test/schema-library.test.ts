/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  assignLibrarySchema,
  createLibrarySchema,
  getComponentSchemaUse,
  getSchemaLibrary,
  reloadSchemaLibrary,
  removeLibrarySchema,
  resetSchemaLibrary,
  setComponentSchemaUse,
  updateLibrarySchema,
} from '../src/domain/schema-library.js';

const STORAGE_KEY = 'facadeur.schema-library.v1';

describe('schema library', () => {
  beforeEach(() => resetSchemaLibrary());

  it('stores a reusable schema and assigns it to a document', () => {
    const media = createLibrarySchema('Media');
    updateLibrarySchema(media.id, {
      oneOf: [
        {
          title: 'Image',
          type: 'object',
          properties: { src: { type: 'string' }, alt: { type: 'string' } },
          required: ['src', 'alt'],
        },
        {
          title: 'Video',
          type: 'object',
          properties: { src: { type: 'string' }, poster: { type: 'string' } },
          required: ['src'],
        },
      ],
    });
    assignLibrarySchema('media', media.id);

    const library = getSchemaLibrary();
    expect(library.schemas).toHaveLength(1);
    expect(library.schemas[0]?.schema.oneOf).toHaveLength(2);
    expect(library.assignments.media).toBe(media.id);
  });

  it('drops the assignment when the schema is removed', () => {
    const schema = createLibrarySchema('Text control');
    assignLibrarySchema('input', schema.id);
    removeLibrarySchema(schema.id);
    expect(getSchemaLibrary().assignments.input).toBeUndefined();
  });

  it('loads example component schemas into an empty library', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemas: [], assignments: {} }));
    const library = reloadSchemaLibrary();
    expect(library.schemas.map((schema) => schema.id)).toEqual([
      'input',
      'textarea',
      'image',
      'video',
      'card',
      'media',
    ]);
    expect(library.assignments).toMatchObject({
      input: 'input',
      textarea: 'textarea',
      card: 'card',
      media: 'media',
    });
    expect(library.schemas.find((schema) => schema.id === 'media')?.schema.oneOf).toHaveLength(2);
    const input = library.schemas.find((schema) => schema.id === 'input')?.schema;
    expect(input?.properties).toMatchObject({
      label: { type: 'string' },
      placeholder: { type: 'string' },
    });
  });

  it('keeps a custom schema and can hide a built-in one', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemas: [{ id: 'custom', name: 'Custom', schema: { type: 'object', properties: {} } }],
        assignments: {},
      }),
    );
    reloadSchemaLibrary();
    expect(getSchemaLibrary().schemas.map((schema) => schema.id)).toContain('custom');
    removeLibrarySchema('image');
    expect(reloadSchemaLibrary().schemas.map((schema) => schema.id)).not.toContain('image');
    expect(getSchemaLibrary().schemas.map((schema) => schema.id)).toContain('video');
  });

  it('normalizes a string assignment through getComponentSchemaUse', () => {
    const schema = createLibrarySchema('Label');
    assignLibrarySchema('hero', schema.id);
    expect(getComponentSchemaUse('hero')).toEqual({
      direct: { kind: 'schema', schemaId: schema.id },
    });
  });

  it('persists fields and defaults through reload', () => {
    const label = createLibrarySchema('Label');
    setComponentSchemaUse('hero', {
      fields: [
        { name: 'title', type: { kind: 'type', type: 'string' } },
        { name: 'media', type: { kind: 'schema', schemaId: label.id } },
      ],
      defaults: { title: 'Hello', media: { src: '/a.png' } },
    });
    const reloaded = reloadSchemaLibrary();
    expect(getComponentSchemaUse('hero')).toEqual({
      fields: [
        { name: 'title', type: { kind: 'type', type: 'string' } },
        { name: 'media', type: { kind: 'schema', schemaId: label.id } },
      ],
      defaults: { title: 'Hello', media: { src: '/a.png' } },
    });
    expect(reloaded.assignments.hero).toEqual({
      fields: [
        { name: 'title', type: { kind: 'type', type: 'string' } },
        { name: 'media', type: { kind: 'schema', schemaId: label.id } },
      ],
      defaults: { title: 'Hello', media: { src: '/a.png' } },
    });
  });
});