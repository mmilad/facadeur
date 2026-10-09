import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  toFlat,
  toNested,
  validateCatalog,
  validateDocumentFile,
} from '@facadeur/core';
import { createProjectTemplateDocument, loadTokens } from '@facadeur/tokens';
import { fontToken, tokenIds } from './fixtures';

describe('canonical design-token serialization', () => {
  const file = createProjectTemplateDocument();

  it('validates and round-trips UUID token maps through nested, flat, and catalog forms', () => {
    const validated = validateDocumentFile(file);

    expect(toNested(toFlat(validated))).toEqual(file);
    expect(validateCatalog([file])[0]).toEqual(file);
    expect(loadTokens(toFlat(file)).properties.length).toBeGreaterThan(0);
    for (const family of Object.values(file.tokens ?? {})) {
      for (const [uuid, token] of Object.entries(family)) expect(token.uuid).toBe(uuid);
    }
  });

  it('adds and removes tokens by UUID while preserving their editable data', () => {
    let document = toFlat(file);
    const blue = document.tokens.color[tokenIds.blue500];
    expect(blue).toBeDefined();
    document = applyCommand(document, {
      type: 'setToken',
      family: 'color',
      token: { ...blue!, value: '#0000ff' },
    });
    expect(document.tokens.color[tokenIds.blue500]).toMatchObject({
      uuid: tokenIds.blue500,
      group: 'blue',
      label: '500',
      value: '#0000ff',
    });

    const exampleFont = document.tokens.font[tokenIds.font];
    expect(exampleFont).toBeDefined();
    document = applyCommand(document, {
      type: 'removeToken',
      family: 'font',
      uuid: tokenIds.font,
    });
    expect(document.tokens.font[tokenIds.font]).toBeUndefined();
    document = applyCommand(document, {
      type: 'setToken',
      family: 'font',
      token: exampleFont!,
    });
    expect(document.tokens.font[tokenIds.font]).toEqual(fontToken);
    document = applyCommand(document, {
      type: 'removeToken',
      family: 'font',
      uuid: tokenIds.font,
    });
    expect(document.tokens.font[tokenIds.font]).toBeUndefined();
  });

  it('round-trips font tokens and UUID breakpoint overrides in nested documents', () => {
    const next = file;

    expect(toNested(toFlat(next))).toEqual(next);
    expect('fonts' in next).toBe(false);
    const fontRemoved = applyCommand(toFlat(next), {
      type: 'removeToken',
      family: 'font',
      uuid: tokenIds.font,
    });
    expect(toNested(fontRemoved).tokens?.font[tokenIds.font]).toBeUndefined();
    expect(toNested(toFlat(next)).tokens?.type[tokenIds.typography]?.breakpoints).toBeDefined();
  });
});
