import { describe, expect, it } from 'vitest';
import { editorStandardCatalog, expandExampleCatalog } from './example-catalog.js';

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
});
