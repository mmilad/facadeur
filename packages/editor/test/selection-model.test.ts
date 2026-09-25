import { describe, expect, it } from 'vitest';
import { toFlat, validateCatalog } from '@facadeur/core';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { nodeIdForHit, renderIdForNode } from '../src/selection-model.js';

const documents = validateCatalog([button, input, card, signIn, specimenSection, specimenPage]);

function flat(id: string) {
  const file = documents.find((document) => document.id === id);
  if (!file) throw new Error(`missing ${id}`);
  return toFlat(file);
}

describe('selection model', () => {
  it('stops a page hit at the section instance', () => {
    const page = flat('specimen');
    expect(nodeIdForHit(page, 'specimen-section/intro/heading', false)).toBe('specimen-section');
    expect(renderIdForNode(page, 'specimen-section', false)).toBe('specimen-section');
    expect(renderIdForNode(page, 'root', false)).toBeNull();
  });

  it('addresses nodes inside a painted section root', () => {
    const section = flat('specimen-section');
    expect(renderIdForNode(section, 'heading', true)).toBe('root/intro/heading');
    expect(nodeIdForHit(section, 'root/intro/heading', true)).toBe('heading');
    expect(renderIdForNode(section, 'root', true)).toBe('root');
  });
});
