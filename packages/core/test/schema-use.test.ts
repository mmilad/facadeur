import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  publicFieldsFor,
  resolveComponentContract,
  resolvePreviewData,
  toFlat,
  toNested,
  validateCatalog,
  type DocumentFile,
  type SchemaCatalog,
} from '../src/index';

const schemaCatalog: SchemaCatalog = {
  schemas: [
    {
      id: 'base',
      name: 'Base',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', default: 'Base title' },
          disabled: { type: 'boolean' },
        },
        required: ['title'],
      },
    },
    {
      id: 'extended',
      name: 'Extended',
      schema: {
        allOf: [{ $ref: 'facadeur://schema/base' }],
        properties: {
          title: { type: 'string', default: 'Extended title' },
          label: { type: 'string' },
        },
        required: ['label'],
      },
    },
  ],
};

const baseDocument: DocumentFile = {
  version: 1,
  id: 'button',
  name: 'Button',
  kind: 'component',
  schemaUse: { direct: { kind: 'schema', schemaId: 'extended' } },
  root: { id: 'root', type: 'frame', tag: 'button' },
};

describe('Core schema-use contract resolution', () => {
  it('resolves named schemas and ordered allOf composition into field contracts', () => {
    const catalog = new Map([[baseDocument.id, baseDocument]]);
    const fields = resolveComponentContract(baseDocument, { documents: catalog, schemaCatalog });
    expect([...fields]).toEqual([
      [
        'title',
        {
          name: 'title',
          type: 'text',
          default: 'Extended title',
          required: true,
          schema: { type: 'string', default: 'Extended title' },
        },
      ],
      ['disabled', { name: 'disabled', type: 'boolean', schema: { type: 'boolean' } }],
      ['label', { name: 'label', type: 'text', required: true, schema: { type: 'string' } }],
    ]);
    expect(publicFieldsFor(baseDocument, { documents: catalog, schemaCatalog })).toEqual(fields);
  });

  it('keeps authored fields when schema use only stores defaults', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'select',
      name: 'Select',
      kind: 'atom',
      fields: [
        {
          name: 'options',
          type: 'array',
          items: {
            type: 'object',
            fields: [
              { name: 'value', type: 'text', required: true },
              { name: 'label', type: 'text', required: true },
            ],
          },
        },
        { name: 'value', type: 'text' },
      ],
      schemaUse: {
        defaults: {
          options: [{ value: 'a', label: 'A' }],
          value: '',
        },
      },
      root: { id: 'root', type: 'frame', tag: 'select' },
    };
    const fields = publicFieldsFor(document, { documents: new Map([[document.id, document]]) });
    expect([...fields.keys()]).toEqual(['options', 'value']);
    expect(() => validateCatalog([document])).not.toThrow();
  });

  it('ignores stale legacy fields when schemaUse is present, but falls back when absent', () => {
    const withUse: DocumentFile = {
      ...baseDocument,
      fields: [{ name: 'old', type: 'text' }],
      schemaUse: { fields: [{ name: 'current', type: { kind: 'type', type: 'boolean' } }] },
    };
    const legacyBase = { ...baseDocument };
    delete legacyBase.schemaUse;
    const legacy: DocumentFile = {
      ...legacyBase,
      fields: [{ name: 'legacy', type: 'number' }],
    };
    const catalog = new Map([
      [withUse.id, withUse],
      [legacy.id, legacy],
    ]);
    expect([...publicFieldsFor(withUse, { documents: catalog, schemaCatalog })]).toEqual([
      ['current', { name: 'current', type: 'boolean', schema: { type: 'boolean' } }],
    ]);
    expect([...publicFieldsFor(legacy, { documents: catalog, schemaCatalog })]).toEqual([
      ['legacy', { name: 'legacy', type: 'number' }],
    ]);
  });

  it('appends nested public fields in document order, with later children winning collisions', () => {
    const child: DocumentFile = {
      ...baseDocument,
      id: 'child',
      name: 'Child',
      schemaUse: { fields: [{ name: 'title', type: { kind: 'type', type: 'number' } }] },
    };
    const owner: DocumentFile = {
      ...baseDocument,
      id: 'owner',
      name: 'Owner',
      schemaUse: { fields: [{ name: 'title', type: { kind: 'type', type: 'boolean' } }] },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'first', type: 'instance', component: child.id },
          { id: 'second', type: 'instance', component: child.id },
        ],
      },
    };
    const docs = new Map([
      [owner.id, owner],
      [child.id, child],
    ]);
    const fields = publicFieldsFor(owner, { documents: docs, schemaCatalog });
    expect(fields.get('title')).toEqual({
      name: 'title',
      type: 'number',
      schema: { type: 'number' },
    });
  });

  it('rejects missing schema references and composition cycles', () => {
    expect(() => validateCatalog([baseDocument], { schemaCatalog })).not.toThrow();
    expect(() =>
      validateCatalog([baseDocument], {
        schemaCatalog: {
          schemas: [{ id: 'loop-a', name: 'A', schema: { $ref: 'facadeur://schema/loop-b' } }],
        },
      }),
    ).toThrow(/missing schema "loop-b"/);
    expect(() =>
      validateCatalog([baseDocument], {
        schemaCatalog: {
          schemas: [
            { id: 'loop-a', name: 'A', schema: { $ref: 'facadeur://schema/loop-b' } },
            { id: 'loop-b', name: 'B', schema: { $ref: 'facadeur://schema/loop-a' } },
          ],
        },
      }),
    ).toThrow(/composition cycle/);
  });

  it('preserves oneOf and anyOf branches in field schema metadata', () => {
    const union: DocumentFile = {
      ...baseDocument,
      schemaUse: { direct: { kind: 'schema', schemaId: 'union' } },
    };
    const fields = publicFieldsFor(union, {
      documents: new Map([[union.id, union]]),
      schemaCatalog: {
        schemas: [
          {
            id: 'union',
            name: 'Union',
            schema: { oneOf: [{ type: 'object', properties: { a: { type: 'string' } } }] },
          },
        ],
      },
    });
    expect(fields.get('value')?.schema).toEqual({
      oneOf: [{ type: 'object', properties: { a: { type: 'string' } } }],
    });
  });

  it('uses explicit root properties as the contract when a schema also has union validation', () => {
    const media: DocumentFile = {
      ...baseDocument,
      id: 'media',
      schemaUse: { direct: { kind: 'schema', schemaId: 'media' } },
    };
    const catalog = new Map([[media.id, media]]);
    const fields = publicFieldsFor(media, {
      documents: catalog,
      schemaCatalog: {
        schemas: [
          {
            id: 'media',
            name: 'Media',
            schema: {
              type: 'object',
              properties: {
                kind: { type: 'string', enum: ['image', 'video'] },
                src: { type: 'string' },
                ratio: { type: 'string' },
              },
              oneOf: [
                {
                  type: 'object',
                  properties: { src: { type: 'string' }, alt: { type: 'string' } },
                },
                {
                  type: 'object',
                  properties: { src: { type: 'string' }, poster: { type: 'string' } },
                },
              ],
            },
          },
        ],
      },
    });
    expect([...fields.keys()]).toEqual(['kind', 'src', 'ratio']);
  });

  it('accepts direct schema references without undefined defaults keys', () => {
    const file = toFlat(baseDocument);
    const updated = applyCommand(file, {
      type: 'setSchemaUse',
      schemaUse: {
        direct: { kind: 'schema', schemaId: 'image' },
        defaults: undefined,
      },
    });
    expect(updated.schemaUse).toEqual({ direct: { kind: 'schema', schemaId: 'image' } });
  });

  it('roundtrips schema catalog/use and exposes new command updates', () => {
    const file = toFlat({ ...baseDocument, schemaCatalog });
    expect(toNested(file)).toMatchObject({ schemaCatalog, schemaUse: baseDocument.schemaUse });
    const updated = applyCommand(file, {
      type: 'setSchemaUse',
      schemaUse: { fields: [{ name: 'caption', type: { kind: 'type', type: 'string' } }] },
    });
    expect(updated.schemaUse?.fields?.[0]?.name).toBe('caption');
    expect(
      applyCommand(updated, { type: 'setSchemaCatalog', schemaCatalog: null }).schemaCatalog,
    ).toBeUndefined();
  });

  it('uses contract defaults and schema-use preview samples with existing preview precedence', () => {
    const document: DocumentFile = {
      ...baseDocument,
      schemaUse: {
        ...baseDocument.schemaUse,
        defaults: { title: 'Sample title', label: 'Sample' },
      },
      previewData: {
        fields: { title: 'Explicit title' },
        variants: { compact: { label: 'Variant sample' } },
      },
      variants: [{ name: 'compact', overrides: { fields: { title: 'Variant default' } } }],
    };
    const fields = resolveComponentContract(document, {
      documents: new Map([[document.id, document]]),
      schemaCatalog,
    });
    expect(resolvePreviewData(document, 'compact', fields)).toEqual({
      title: 'Explicit title',
      label: 'Variant sample',
    });
  });

  it('accepts named schema descriptions while rejecting unrelated catalog properties', () => {
    const catalogBase = { ...baseDocument };
    delete catalogBase.schemaUse;
    const described: DocumentFile = {
      ...catalogBase,
      schemaCatalog: {
        schemas: [{ id: 'named', name: 'Named', description: 'A reusable shape', schema: {} }],
      },
    };
    expect(() => validateCatalog([described])).not.toThrow();
    const design: DocumentFile = {
      version: 1,
      id: 'design',
      name: 'Design',
      kind: 'atom',
      schemaCatalog,
      root: { id: 'root', type: 'frame' },
    };
    expect(() => validateCatalog([baseDocument, design])).not.toThrow();
    expect(() =>
      validateCatalog([design, { ...design, id: 'other-design', name: 'Other Design' }]),
    ).toThrow(/only one schemaCatalog owner/);
    expect(() =>
      validateCatalog([
        {
          ...described,
          schemaCatalog: {
            schemas: [{ id: 'named', name: 'Named', schema: {}, unexpected: true }],
          },
        },
      ]),
    ).toThrow();
  });
});
