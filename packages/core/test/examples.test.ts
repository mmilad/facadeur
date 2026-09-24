import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  compileDocumentValidator,
  documentJsonSchema,
  toFlat,
  toNested,
  validateCatalog,
} from '@facadeur/core';

const examplesDir = fileURLToPath(new URL('../../../examples/', import.meta.url));
const schemaPath = fileURLToPath(new URL('../../../schema/document.schema.json', import.meta.url));

describe('examples', () => {
  const files = readdirSync(examplesDir)
    .filter((name) => name.endsWith('.json'))
    .sort();

  it('validates every example and round-trips it', () => {
    expect(files.length).toBeGreaterThan(0);
    const raw = files.map(
      (name) => JSON.parse(readFileSync(`${examplesDir}${name}`, 'utf8')) as unknown,
    );
    const documents = validateCatalog(raw);
    for (const document of documents) {
      expect(toNested(toFlat(document))).toEqual(document);
    }
    const page = documents.find((document) => document.id === 'specimen');
    expect(page?.kind).toBe('page');
    expect(page?.root).toMatchObject({
      type: 'frame',
      children: [{ type: 'instance', component: 'specimen-section' }],
    });
  });

  it('exports JSON Schema that matches the committed file', () => {
    const committed = JSON.parse(readFileSync(schemaPath, 'utf8')) as unknown;
    expect(committed).toEqual(JSON.parse(JSON.stringify(documentJsonSchema())));
  });

  it('can describe a different kind list', () => {
    const validate = compileDocumentValidator({
      kinds: ['block', 'page'],
      schemaId: 'https://github.com/mmilad/facadeur/schema/custom.json',
    });
    const ok = validate({
      version: 1,
      id: 'block',
      name: 'Block',
      kind: 'block',
      root: { id: 'root', type: 'frame' },
    });
    expect(ok).toBe(true);
    expect(
      validate({
        version: 1,
        id: 'atom',
        name: 'Atom',
        kind: 'atom',
        root: { id: 'root', type: 'frame' },
      }),
    ).toBe(false);
  });
});
