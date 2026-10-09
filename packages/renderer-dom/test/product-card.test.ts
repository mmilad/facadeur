// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { renderDefinitionRoot } from '../src/render-node';

describe('Product Card TypeScript example', () => {
  it('renders the catalog definition and its nested Button example', () => {
    const catalog = createExampleCatalog();
    const productCard = catalog.components?.[exampleIds.components.productCard.definition];
    if (!productCard) throw new Error('missing Product Card example');

    const element = renderDefinitionRoot(productCard, catalog, document);

    expect(element.tagName).toBe('ARTICLE');
    expect(element.querySelector('h2')?.textContent).toBe('Everyday ceramic mug');
    expect(element.querySelector('p')?.textContent).toBe('€24.00');
    expect(element.querySelector('img')?.getAttribute('alt')).toBe(
      'Sage green ceramic mug on a warm neutral background',
    );
    expect(element.querySelector('button')?.textContent).toBe('Continue');
  });
});
