import { describe, expect, it } from 'vitest';
import {
  allExampleDocuments,
  editorStandardCatalog,
  exampleSchemaCatalog,
  expandExampleCatalog,
} from './example-catalog';

describe('example catalog fixtures', () => {
  it('pulls transitive instance dependencies from examples/', () => {
    const ids = expandExampleCatalog(['input']).map((doc) => doc.id);
    expect(ids).toContain('input');
    expect(ids).toContain('form-input');
  });

  it('editorStandardCatalog includes specimen stack and form-input', () => {
    const ids = editorStandardCatalog().map((doc) => doc.id);
    expect(ids).toEqual(expect.arrayContaining(['specimen', 'form-input', 'button']));
  });

  it('validates committed examples against the real schema library and preserves assignments', () => {
    const textarea = allExampleDocuments().find((document) => document.id === 'textarea');
    expect(textarea?.schemaUse?.direct).toEqual({ kind: 'schema', schemaId: 'textarea' });
    expect(exampleSchemaCatalog().schemas.some((schema) => schema.id === 'textarea')).toBe(true);
  });
});
