import { describe, expect, it } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { generateReact } from '../src';

describe('Catalog-driven React code generation', () => {
  it('generates selected definitions, referenced design tokens, and Storybook stories', () => {
    const catalog = createExampleCatalog();
    const button = Object.values(catalog.atoms).find((definition) => definition.name === 'Button');
    expect(button).toBeDefined();

    const generated = generateReact({ catalog, entries: [button!.uuid] });
    const component = generated.ui.find((file) => file.path === 'components/button/index.tsx');

    expect(component?.contents).toContain('export function Button');
    expect(component?.contents).toContain('<button');
    expect(generated.ui.find((file) => file.path === 'styles/components.css')?.contents).toContain(
      `[data-facadeur-codegen-node="${button!.root.uuid}"]`,
    );
    expect(
      generated.ui.find((file) => file.path === 'styles/design-tokens.css')?.contents,
    ).toContain('--color-');
    expect(generated.stories[0]?.contents).toContain("from '@facadeur/ui'");
  });

  it('preserves authored classes when attaching generated node styles', () => {
    const catalog = createExampleCatalog();
    const button = Object.values(catalog.atoms).find((definition) => definition.name === 'Button')!;
    Reflect.set(button.root.dom, 'attributes', {
      ...button.root.dom.attributes,
      class: 'authored-button',
    });

    const generated = generateReact({ catalog, entries: [button.uuid] });
    const component = generated.ui.find((file) => file.path === 'components/button/index.tsx');

    expect(component?.contents).toContain(
      `className={"authored-button facadeur-node-${button.root.uuid}"}`,
    );
    expect(component?.contents).toContain(`data-facadeur-codegen-node={"${button.root.uuid}"}`);
  });

  it('compiles Catalog global styles and UUID-bound selectors into generated CSS', () => {
    const catalog = createExampleCatalog();
    const button = Object.values(catalog.atoms).find((definition) => definition.name === 'Button')!;
    const childUuid = '550e8400-e29b-41d4-a716-0000000004ff';
    const accentUuid = '550e8400-e29b-41d4-a716-000000000401';
    const tabletUuid = catalog.globalStyles!.breakpoints![1]!.uuid;
    Reflect.set(button.root.dom, 'children', [
      { uuid: childUuid, dom: { tagName: 'span', attributes: { class: 'icon' } } },
    ]);
    Reflect.set(button.root.dom, 'attributes', {
      ...button.root.dom.attributes,
      class: 'authored-button',
    });
    const withGlobalStyles = {
      ...catalog,
      globalStyles: {
        ...catalog.globalStyles,
        block: {
          declarations: { color: `{token:${accentUuid}}` },
          states: { hover: { color: '#000' } },
          variants: { tone: { quiet: { declarations: { opacity: '0.5' } } } },
          breakpoints: { [tabletUuid]: { declarations: { padding: '8px' } } },
          children: { [childUuid]: { declarations: { display: 'inline-flex' } } },
          rules: [
            {
              id: 'button-icon',
              selector: '.authored-button .icon',
              bindings: { 'authored-button': button.root.uuid, icon: childUuid },
              declarations: { color: '#fff' },
            },
          ],
        },
        tokenInterface: {
          sets: { [accentUuid]: '#2563eb', 'button.padding.block': '8px' },
        },
      },
    };

    const generated = generateReact({ catalog: withGlobalStyles, entries: [button.uuid] });
    const css = generated.ui.find((file) => file.path === 'styles/components.css')?.contents ?? '';
    const component = generated.ui.find((file) => file.path === 'components/button/index.tsx');

    expect(css).toContain(':root {\n  color: var(--color-accent-default);');
    expect(css).toContain(':root:hover {');
    expect(css).toContain(':root[data-variant-tone="quiet"] {');
    expect(css).toContain(':root {\n  --button-padding-block: 8px;');
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).toContain(
      `[data-facadeur-codegen-node="${button.root.uuid}"] > [data-facadeur-codegen-node="${childUuid}"]`,
    );
    expect(css).toContain(
      `.facadeur-node-${button.root.uuid} .facadeur-node-${childUuid} {\n  color: #fff;`,
    );
    expect(component?.contents).toContain(`data-facadeur-codegen-node={"${childUuid}"}`);
    expect(component?.contents).toContain(`facadeur-node-${childUuid}`);
  });

  it('includes referenced definitions and rejects unknown entries', () => {
    const catalog = createExampleCatalog();
    const signIn = Object.values(catalog.components).find(
      (definition) => definition.name === 'Sign in',
    )!;
    const generated = generateReact({ catalog, entries: [signIn.uuid] });

    expect(generated.ui.some((file) => file.path === 'components/input/index.tsx')).toBe(true);
    expect(generated.ui.some((file) => file.path === 'components/button/index.tsx')).toBe(true);
    expect(() => generateReact({ catalog, entries: ['missing-definition'] })).toThrow(
      'Unknown codegen entry or dependency',
    );
  });

  it('keeps Catalog schema-backed prop references dynamic in generated components', () => {
    const catalog = createExampleCatalog();
    const card = Object.values(catalog.components).find(
      (definition) => definition.name === 'Card',
    )!;
    const generated = generateReact({ catalog, entries: [card.uuid] });
    const component = generated.ui.find((file) => file.path === 'components/card/index.tsx');

    expect(component?.contents).toContain(
      'export type Card1Props = Readonly<{ "eyebrow"?: string; "title"?: string; "body"?: string }>',
    );
    expect(component?.contents).toContain('getProp(props, "title") ?? "Design with confidence"');
    expect(generated.stories[0]?.contents).toContain('"title":"Design with confidence"');
  });
});
