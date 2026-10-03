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
  resolveLibrarySchema,
  schemaRefUri,
  setComponentSchemaUse,
  updateLibrarySchema,
} from '../src/domain/schema/schema-library';

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

  it('supports one-schema allOf references without inheriting additionalProperties', () => {
    const base = createLibrarySchema('Base');
    const extended = createLibrarySchema('Extended');
    expect(
      updateLibrarySchema(base.id, {
        type: 'object',
        properties: { id: { type: 'string' } },
        additionalProperties: false,
      }),
    ).toEqual([]);
    expect(
      updateLibrarySchema(extended.id, {
        type: 'object',
        properties: { label: { type: 'string' } },
        additionalProperties: true,
        allOf: [{ $ref: schemaRefUri(base.id) }],
      }),
    ).toEqual([]);

    const resolved = resolveLibrarySchema(extended.id, getSchemaLibrary().schemas);
    expect(resolved?.allOf?.[0]).not.toHaveProperty('additionalProperties');
    expect(resolved?.additionalProperties).toBe(true);
    expect(resolved?.properties).toEqual({ label: { type: 'string' } });
  });

  it('rejects missing, cyclic, and incompatible composition references without saving them', () => {
    const first = createLibrarySchema('First');
    const second = createLibrarySchema('Second');
    const missing = updateLibrarySchema(first.id, {
      allOf: [{ $ref: schemaRefUri('absent') }],
    });
    expect(missing).toContainEqual({
      schemaId: first.id,
      message: 'Schema reference “absent” does not exist.',
    });
    expect(
      getSchemaLibrary().schemas.find((entry) => entry.id === first.id)?.schema.allOf,
    ).toBeUndefined();

    expect(updateLibrarySchema(first.id, { type: 'string' })).toEqual([]);
    expect(
      updateLibrarySchema(second.id, {
        type: 'object',
        allOf: [{ $ref: schemaRefUri(first.id) }],
      }),
    ).toContainEqual({
      schemaId: second.id,
      message: '$: the allOf schemas have incompatible type constraints.',
    });
    expect(
      getSchemaLibrary().schemas.find((entry) => entry.id === second.id)?.schema.allOf,
    ).toBeUndefined();

    expect(
      updateLibrarySchema(first.id, { allOf: [{ $ref: schemaRefUri(first.id) }] }),
    ).toContainEqual(expect.objectContaining({ message: expect.stringContaining('cycle') }));
  });

  it('revalidates dependent contracts when a schema changes', () => {
    const base = createLibrarySchema('Base');
    const dependent = createLibrarySchema('Dependent');
    expect(updateLibrarySchema(base.id, { type: 'object' })).toEqual([]);
    expect(
      updateLibrarySchema(dependent.id, {
        type: 'object',
        allOf: [{ $ref: schemaRefUri(base.id) }],
      }),
    ).toEqual([]);

    const issues = updateLibrarySchema(base.id, { type: 'string' });
    expect(issues).toContainEqual({
      schemaId: dependent.id,
      message: '$: the allOf schemas have incompatible type constraints.',
    });
    expect(getSchemaLibrary().schemas.find((entry) => entry.id === base.id)?.schema.type).toBe(
      'object',
    );
  });

  it('blocks deleting a schema that another contract extends', () => {
    const base = createLibrarySchema('Base');
    const dependent = createLibrarySchema('Dependent');
    expect(updateLibrarySchema(dependent.id, { allOf: [{ $ref: schemaRefUri(base.id) }] })).toEqual(
      [],
    );

    expect(removeLibrarySchema(base.id)).toContainEqual({
      schemaId: dependent.id,
      message: `Schema reference “${base.id}” does not exist.`,
    });
    expect(getSchemaLibrary().schemas.map(({ id }) => id)).toContain(base.id);
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
    expect(input?.properties?.label).not.toHaveProperty('default');
  });

  it('drops legacy default keywords copied onto a stored schema', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        seeded: true,
        custom: [],
        overrides: {
          input: {
            id: 'input',
            name: 'Input',
            schema: {
              type: 'object',
              properties: { label: { type: 'string', title: 'Label', default: 'Label' } },
            },
          },
        },
        hidden: [],
        assignments: { input: 'input' },
      }),
    );
    const input = reloadSchemaLibrary().schemas.find((schema) => schema.id === 'input');
    expect(input?.schema.properties?.label).toEqual({ type: 'string', title: 'Label' });
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
