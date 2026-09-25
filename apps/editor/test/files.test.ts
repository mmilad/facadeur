import { describe, expect, it } from 'vitest';
import { toFlat, validateDocumentFile } from '@facadeur/core';
import button from '../../../examples/button.json';
import { documentToJson, parseDocumentText, suggestedFilename } from '../src/domain/files.js';

describe('document files', () => {
  it('round-trips nested JSON', () => {
    const file = validateDocumentFile(button);
    const json = documentToJson(toFlat(file));
    expect(parseDocumentText(json)).toEqual(file);
  });

  it('rejects text that is not a document', () => {
    expect(() => parseDocumentText('not json')).toThrow(/not JSON/i);
    expect(() => parseDocumentText('{"version":1}')).toThrow();
  });

  it('keeps the specimen filename', () => {
    expect(suggestedFilename('specimen', { specimen: 'specimen-page.json' })).toBe(
      'specimen-page.json',
    );
    expect(suggestedFilename('badge', {})).toBe('badge.json');
  });
});
