import { describe, expect, it } from 'vitest';
import { toFlat, validateCatalog } from '@facadeur/core';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import {
  documentChain,
  instanceOpenTarget,
  nodeIdForHit,
  renderIdForNode,
  resolveClick,
} from '../src/selection-model.js';

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

  it('selects the top of the context, then one level deeper, and stops at instances', () => {
    const section = flat('specimen-section');
    const chain = documentChain(section, 'root/intro/heading', true);
    expect(chain).toEqual(['root', 'intro', 'heading']);
    expect(resolveClick({ doc: section, chain, selectedId: null, mode: 'context' })).toBe('intro');
    expect(resolveClick({ doc: section, chain, selectedId: 'intro', mode: 'context' })).toBe(
      'intro',
    );
    expect(resolveClick({ doc: section, chain, selectedId: 'intro', mode: 'deeper' })).toBe(
      'heading',
    );
    expect(resolveClick({ doc: section, chain, selectedId: 'heading', mode: 'context' })).toBe(
      'heading',
    );
    expect(resolveClick({ doc: section, chain, selectedId: null, mode: 'deepest' })).toBe(
      'heading',
    );

    const page = flat('specimen');
    const pageChain = documentChain(page, 'specimen-section/intro/heading', false);
    expect(pageChain).toEqual(['root', 'specimen-section']);
    expect(resolveClick({ doc: page, chain: pageChain, selectedId: null, mode: 'deepest' })).toBe(
      'specimen-section',
    );
    expect(
      resolveClick({ doc: page, chain: pageChain, selectedId: 'specimen-section', mode: 'deeper' }),
    ).toBe('specimen-section');
    expect(instanceOpenTarget(page, pageChain, 'specimen-section')).toBe('specimen-section');
    expect(instanceOpenTarget(page, pageChain, 'root')).toBeNull();
    expect(instanceOpenTarget(page, pageChain, null)).toBeNull();
  });
});
