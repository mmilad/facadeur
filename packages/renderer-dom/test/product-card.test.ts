// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  resolvePreviewData,
  resolveVariantDocument,
  toFlat,
  validateCatalog,
  withPreviewData,
  type DocumentFile,
} from '@facadeur/core';
import productCardJson from '../../../examples/product-card.json';
import buttonJson from '../../../examples/button.json';
import { createDomRenderer } from '../src/render';

const [productCard, button] = validateCatalog([productCardJson, buttonJson]) as [
  DocumentFile,
  DocumentFile,
];
const sample = productCard.previewData!.fields!;

describe('Product Card example', () => {
  it.each(['default', 'compact'])(
    'renders inherited image, title, price and Button samples in %s',
    (variant) => {
      const host = document.createElement('div');
      const renderer = createDomRenderer({
        parent: host,
        catalog: [productCard, button],
        paintRoot: true,
        resolveMountedDocument: (source) =>
          withPreviewData(resolveVariantDocument(source, variant), variant),
        prepareInstanceDocument: (source, selected) => withPreviewData(source, selected),
      });
      try {
        renderer.mount(productCard);
        expect(host.querySelector('article')).not.toBeNull();
        expect(host.querySelector('h2')?.textContent).toBe(sample.title);
        expect(host.querySelector('p')?.textContent).toBe(sample.price);
        const image = host.querySelector('img')!;
        expect(image.getAttribute('src')).toBe(sample.imageSrc);
        expect(image.getAttribute('alt')).toBe(sample.imageAlt);
        expect(image.src).toMatch(/^data:image\/svg\+xml,/);
        const svg = new DOMParser().parseFromString(
          decodeURIComponent(image.src.split(',')[1]!),
          'image/svg+xml',
        );
        expect(svg.querySelector('parsererror')).toBeNull();
        expect(svg.documentElement.localName).toBe('svg');
        expect(svg.querySelector('image, script, foreignObject')).toBeNull();
        const action = host.querySelector('button')!;
        expect(action.textContent).toBe(sample.buttonLabel);
        expect(action.dataset.component).toBe('button');
        expect(renderer.records.get('root/content/button')?.fields).toMatchObject({
          label: sample.buttonLabel,
        });
        expect(resolvePreviewData(productCard, variant)).toEqual(sample);
        expect(productCard.fields?.every((field) => field.default === undefined)).toBe(true);
      } finally {
        renderer.destroy();
      }
    },
  );

  it.each(['default', 'compact'])(
    'propagates parent field data through the card and Button in %s',
    (variant) => {
      const values = {
        title: 'Parent product',
        price: '€39.00',
        imageSrc:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Crect width='10' height='10' fill='navy'/%3E%3C/svg%3E",
        imageAlt: 'Parent image description',
        buttonLabel: 'Buy this product',
      };
      const parent: DocumentFile = {
        version: 1,
        id: 'product-parent',
        name: 'Product parent',
        kind: 'component',
        fields: productCard.fields!.map((field) => ({
          ...field,
          default: values[field.name as keyof typeof values],
        })),
        root: {
          id: 'root',
          type: 'frame',
          children: [
            {
              id: 'product',
              type: 'instance',
              component: 'product-card',
              fieldBindings: Object.fromEntries(Object.keys(values).map((name) => [name, name])),
              variants: { variant },
            },
          ],
        },
      };
      validateCatalog([parent, productCard, button]);
      const host = document.createElement('div');
      const renderer = createDomRenderer({
        parent: host,
        catalog: [parent, productCard, button],
        prepareInstanceDocument: (source, selected) => withPreviewData(source, selected),
      });
      try {
        renderer.mount(parent);
        expect(host.querySelector('h2')?.textContent).toBe(values.title);
        expect(host.querySelector('p')?.textContent).toBe(values.price);
        expect(host.querySelector('img')?.getAttribute('src')).toBe(values.imageSrc);
        expect(host.querySelector('img')?.getAttribute('alt')).toBe(values.imageAlt);
        expect(host.querySelector('button')?.textContent).toBe(values.buttonLabel);
        expect(host.querySelector('article')?.getAttribute('data-variant')).toBe(variant);
      } finally {
        renderer.destroy();
      }
    },
  );

  it('keeps Compact sparse with bounded responsive image and content layouts', () => {
    const base = toFlat(productCard);
    const compact = toFlat(resolveVariantDocument(productCard, 'compact'));
    expect(base.variantPresets?.find((preset) => preset.name === 'compact')?.overrides).toEqual({
      nodes: {
        image: { layout: { height: { mode: 'fixed', size: 160 } } },
        content: { layout: { gap: '{space.gap.sm}', padding: '{space.inset.md}' } },
      },
    });
    expect(compact.fields).toEqual(base.fields);
    expect(compact.previewData).toEqual(base.previewData);
    expect(Object.keys(compact.nodes)).toEqual(Object.keys(base.nodes));
    expect(compact.nodes.button).toEqual(base.nodes.button);
    for (const [variant, height] of [
      ['default', 240],
      ['compact', 160],
    ] as const) {
      const resolved = resolveVariantDocument(productCard, variant);
      const flat = toFlat(resolved);
      expect(flat.nodes.root?.layout?.width).toEqual({ mode: 'fill', max: 360 });
      expect(flat.nodes.image?.layout?.width).toEqual({ mode: 'fill' });
      expect(flat.nodes.image?.layout?.height).toEqual({ mode: 'fixed', size: height });
      expect(resolved.styles?.children?.image?.declarations?.objectFit).toBe('cover');
      expect(flat.nodes.content?.layout?.padding).toBe(
        variant === 'compact' ? '{space.inset.md}' : '{space.inset.lg}',
      );
    }
  });
});
