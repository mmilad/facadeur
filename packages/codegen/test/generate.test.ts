import { describe, expect, it } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { generateReact } from '../src';

describe('Catalog-driven React code generation', () => {
  it('emits generated root class styles before authored class styles', () => {
    const catalog = createExampleCatalog();
    const definition = Object.values(catalog.atoms)[0]!;
    const root = definition.root;
    const generated = root.classes?.find((item) => item.generated);
    expect(generated).toBeDefined();
    const orderedDefinition = {
      ...definition,
      root: {
        ...root,
        classes: [
          { name: 'is-open', style: { declarations: { display: 'block' } } },
          { ...generated!, style: { declarations: { display: 'none' } } },
        ],
      },
    };
    const orderedCatalog = {
      ...catalog,
      atoms: { ...catalog.atoms, [definition.uuid]: orderedDefinition },
    };

    const output = generateReact({ catalog: orderedCatalog, entries: [definition.uuid] });
    const css = output.ui.find((file) => file.path === 'styles/components.css')?.contents ?? '';
    const generatedRule = css.indexOf(`.facadeur-node-${root.uuid}.${generated!.name}`);
    const authoredRule = css.indexOf(`.facadeur-node-${root.uuid}.is-open`);
    expect(generatedRule).toBeGreaterThanOrEqual(0);
    expect(authoredRule).toBeGreaterThan(generatedRule);
  });

  it('generates selected definitions, referenced design tokens, and Storybook stories', () => {
    const catalog = createExampleCatalog();
    const button = Object.values(catalog.atoms).find((definition) => definition.name === 'Button');
    expect(button).toBeDefined();

    const generated = generateReact({ catalog, entries: [button!.uuid] });
    const component = generated.ui.find((file) => file.path === 'components/button/index.tsx');

    expect(component?.contents).toContain('export function Button');
    expect(component?.contents).toContain('<button');
    const componentsCss = generated.ui.find(
      (file) => file.path === 'styles/components.css',
    )?.contents;
    expect(componentsCss).toMatch(/^\*,\n\*::before,\n\*::after \{\n  box-sizing: border-box;/);
    expect(componentsCss).toContain(`.facadeur-node-${button!.root.uuid}`);
    expect(
      generated.ui.find((file) => file.path === 'styles/design-tokens.css')?.contents,
    ).toContain('--color-');
    expect(generated.stories[0]?.contents).toContain("from '@facadeur/ui'");
  });

  it('keeps same-name definitions in separate component and story files', () => {
    const catalog = createExampleCatalog();
    const generated = generateReact({ catalog });
    expect(new Set(generated.ui.map((file) => file.path)).size).toBe(generated.ui.length);
    expect(new Set(generated.stories.map((file) => file.path)).size).toBe(generated.stories.length);
    expect(generated.ui.some((file) => file.path === 'components/input-2/index.tsx')).toBe(true);
    const input = generated.ui.find((file) => file.path === 'components/input/index.tsx');
    expect(input?.contents).toContain('autoComplete=');
    const textarea = generated.ui.find((file) => file.path === 'components/textarea/index.tsx');
    expect(textarea?.contents).toContain('rows={3}');
  });

  it('preserves authored classes when attaching generated node styles', () => {
    const catalog = createExampleCatalog();
    const button = Object.values(catalog.atoms).find((definition) => definition.name === 'Button')!;
    Reflect.set(button.root, 'classes', [
      ...(button.root.classes ?? []),
      { name: 'authored-button' },
    ]);

    const generated = generateReact({ catalog, entries: [button.uuid] });
    const component = generated.ui.find((file) => file.path === 'components/button/index.tsx');

    expect(component?.contents).toContain(`"authored-button"`);
    expect(component?.contents).toContain(`data-facadeur-codegen-node={"${button.root.uuid}"}`);
  });

  it('compiles Catalog global styles and UUID-bound selectors into generated CSS', () => {
    const catalog = createExampleCatalog();
    const button = Object.values(catalog.atoms).find((definition) => definition.name === 'Button')!;
    const childUuid = '550e8400-e29b-41d4-a716-0000000004ff';
    const accentUuid = '550e8400-e29b-41d4-a716-000000000401';
    const tabletUuid = catalog.globalStyles!.breakpoints![1]!.uuid;
    Reflect.set(button.root.dom, 'children', [
      { uuid: childUuid, classes: [{ name: 'icon' }], dom: { tagName: 'span' } },
    ]);
    Reflect.set(button.root, 'classes', [
      ...(button.root.classes ?? []),
      { name: 'authored-button' },
    ]);
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

  it('compiles portable state transitions and emits into React handlers', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const toggle = component.root.dom.children?.[0] ?? component.root;
    Reflect.set(component, 'schema', {
      kind: 'inline',
      schema: {
        type: 'object',
        properties: { onChange: { type: 'boolean' } },
        additionalProperties: false,
      },
    });
    Reflect.set(component, 'behavior', {
      state: { open: false },
      transitions: [
        {
          nodeUuid: toggle.uuid,
          event: 'click',
          actions: [
            {
              kind: 'set-state',
              name: 'open',
              value: {
                kind: 'operation',
                operator: 'toggle',
                values: [{ kind: 'state', name: 'open' }],
              },
            },
            {
              kind: 'emit',
              name: 'change',
              args: [
                { kind: 'state', name: 'open' },
                { kind: 'state-after-transition', name: 'open' },
              ],
            },
          ],
        },
      ],
    });
    const generated = generateReact({ catalog, entries: [component.uuid] });
    const output = generated.ui.find((file) => file.path.startsWith('components/'))?.contents ?? '';
    expect(output).toContain('"onChange"?: (...args: any[]) => void');
    expect(output).toContain('useState<boolean>(false)');
    expect(output).toContain('onClick={handleBehaviorAt');
    expect(output).toContain('const nextBehaviorState0 = !(behaviorState0);');
    expect(output).toContain('setBehaviorState0(nextBehaviorState0);');
    expect(output).toContain('props["onChange"]?.(behaviorState0, nextBehaviorState0);');
  });

  it('binds class conditions to private component state in generated React output', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    Reflect.set(component, 'behavior', { state: { open: false }, transitions: [] });
    Reflect.set(component.root, 'classes', [
      {
        name: 'is-open',
        condition: {
          kind: 'condition',
          left: { kind: 'reference', reference: '{state:open}' },
          operator: 'equals',
          right: { kind: 'literal', value: true },
        },
      },
    ]);

    const generated = generateReact({ catalog, entries: [component.uuid] });
    const output = generated.ui.find((file) => file.path.startsWith('components/'))?.contents ?? '';
    expect(output).toContain('Object.is((behaviorState0), (true)) ? "is-open" : ""');
  });

  it('keeps repeated state actions and same-event transitions sequential', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const target = component.root.dom.children?.[0] ?? component.root;
    Reflect.set(component, 'schema', {
      kind: 'inline',
      schema: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          onChange: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    });
    Reflect.set(component, 'behavior', {
      state: { open: false, count: 0 },
      transitions: [
        {
          nodeUuid: target.uuid,
          event: 'click',
          actions: [
            { kind: 'set-state', name: 'open', value: { kind: 'literal', value: true } },
            { kind: 'increment', name: 'count', amount: 2 },
          ],
        },
        {
          nodeUuid: target.uuid,
          event: 'click',
          actions: [
            {
              kind: 'set-state',
              name: 'open',
              value: { kind: 'state-after-transition', name: 'open' },
            },
            { kind: 'increment', name: 'count', amount: 3 },
            {
              kind: 'emit',
              name: 'change',
              args: [
                { kind: 'state', name: 'open' },
                { kind: 'state-after-transition', name: 'count' },
                { kind: 'event', path: 'currentTarget.value' },
                { kind: 'prop', path: 'label' },
              ],
            },
          ],
        },
      ],
    });

    const generated = generateReact({ catalog, entries: [component.uuid] });
    const output = generated.ui.find((file) => file.path.startsWith('components/'))?.contents ?? '';
    expect(output.match(/onClick=\{handleBehaviorAt/g)).toHaveLength(1);
    expect(output).toContain('const nextBehaviorState0 = true;');
    expect(output).toContain('const nextBehaviorState1 = (behaviorState1 + 2);');
    expect(output).toContain('const nextBehaviorState2 = nextBehaviorState0;');
    expect(output).toContain('const nextBehaviorState3 = (nextBehaviorState1 + 3);');
    expect(output).toContain(
      'props["onChange"]?.(behaviorState0, nextBehaviorState3, getProp(event, "currentTarget.value"), getProp(props, "label"));',
    );
  });
});
