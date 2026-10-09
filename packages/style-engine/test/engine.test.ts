/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@facadeur/store-yjs';
import { createDomRenderer } from '@facadeur/renderer-dom';
import { createStyleEngine, type CompiledRule } from '@facadeur/style-engine';
import { compileDocument } from '@facadeur/style-engine';
import type { DocumentFile } from '@facadeur/core';
import { exampleCatalog, exampleIds as fixtureIds } from '@facadeur/examples';
import { documentFromExample } from './helpers/example-document';

const accentUuid = fixtureIds.tokens.color.accent.default;
const neutral600Uuid = fixtureIds.tokens.color.neutral._600;
const phoneBreakpointUuid = fixtureIds.catalog.breakpoints.phone;
const wideBreakpointUuid = fixtureIds.catalog.breakpoints.wide;
const button = documentFromExample(
  exampleCatalog.atoms[fixtureIds.components.button.definition]!,
);
const formSegmented = documentFromExample(
  exampleCatalog.components[fixtureIds.components.formSegmented.definition]!,
);
const formInput = documentFromExample(
  exampleCatalog.atoms[fixtureIds.components.formInput.definition]!,
);
const textarea = documentFromExample(
  exampleCatalog.components[fixtureIds.components.textarea.definition]!,
);

function text(rules: readonly CompiledRule[]): string {
  return rules
    .map((rule) => {
      const body = rule.declarations.map(([name, value]) => `${name}: ${value}`).join('; ');
      const block = `${rule.selector} { ${body} }`;
      return rule.minWidth === undefined
        ? block
        : `@media (min-width: ${rule.minWidth}px) { ${block} }`;
    })
    .join('\n');
}

describe('component style block', () => {
  const compiled = text(compileDocument(button, { globalTokens: exampleCatalog.tokens }));

  it('compiles the button example with its catalog token references', () => {
    expect(compiled).toContain(`[data-component="${button.id}"]`);
    expect(compiled).toContain('background: var(--color-bg-canvas)');
    expect(compiled).toContain('color: var(--color-text-primary)');
    expect(compiled).toContain('font-family: var(--type-label--font-family)');
    expect(compiled).toContain('font-size: var(--type-label--font-size)');
    expect(compiled).toContain('display: flex');
    expect(compiled).toContain('flex-direction: row');
    expect(compiled).toContain('width: auto');
  });

  it('keeps native form controls out of the frame flex layout', () => {
    const formControl = compileDocument(formInput, { globalTokens: exampleCatalog.tokens }).find(
      (rule) => rule.selector.includes(`[data-component="${formInput.id}"]`),
    );
    expect(formControl?.declarations).toContainEqual(['box-sizing', 'border-box']);
    expect(formControl?.declarations.some(([name]) => name === 'flex-direction')).toBe(false);

    const textareaControl = compileDocument(textarea, { globalTokens: exampleCatalog.tokens }).find(
      (rule) =>
        rule.selector.includes(`[data-node="${fixtureIds.components.textarea.nodes.textarea1}"]`),
    );
    expect(textareaControl?.declarations).toContainEqual(['display', 'block']);
    expect(textareaControl?.declarations).toContainEqual(['box-sizing', 'border-box']);
    expect(textareaControl?.declarations.some(([name]) => name === 'flex-direction')).toBe(false);
  });

  it('compiles the segmented component example with its catalog token references', () => {
    const compiled = text(compileDocument(formSegmented, { globalTokens: exampleCatalog.tokens }));
    expect(compiled).toContain(`[data-component="${formSegmented.id}"]`);
    expect(compiled).toContain('flex-direction: column');
    expect(compiled).toContain('font-family: var(--type-caption--font-family)');
  });

  it('writes the painted canvas root into the live stylesheet', () => {
    const engine = createStyleEngine(document);
    engine.setDocument(button, { address: 'canvas', paintRoot: true });
    const css = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(css).toContain(`[data-id="${button.root.id}"]`);
    expect(css).toContain('display: flex');
    engine.setDocument(button, { address: 'canvas' });
    const kept = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(kept).toContain(`[data-id="${button.root.id}"]`);
    engine.destroy();
  });

  it('emits the frame root on the canvas only when paintRoot is set', () => {
    const painted = text(compileDocument(button, { address: 'canvas', paintRoot: true }));
    expect(painted).toContain(`[data-id="${button.root.id}"]`);
    expect(painted).toContain('display: flex');
    const hidden = text(compileDocument(button, { address: 'canvas' }));
    expect(hidden).not.toContain(`[data-id="${button.root.id}"]`);
  });

  it('compiles named preset style layers against data-variant', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'named-style',
      name: 'Named style',
      kind: 'component',
      variants: [{ name: 'compact' }],
      styles: {
        variants: { variant: { compact: { declarations: { color: 'red' } } } },
      },
      root: { id: 'root', type: 'frame', tag: 'div' },
    };
    const compiled = text(compileDocument(document));
    expect(compiled).toContain('[data-component="named-style"][data-variant="compact"]');
    expect(compiled).toContain('color: red');
  });

  it('compiles styles declared directly in named preset overrides', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'named-override-style',
      name: 'Named override style',
      kind: 'component',
      variants: [
        { name: 'default' },
        { name: 'compact', overrides: { styles: { declarations: { color: 'navy' } } } },
      ],
      styles: { declarations: { color: 'black' } },
      root: { id: 'root', type: 'frame', tag: 'div' },
    };
    const compiled = text(compileDocument(document));
    expect(compiled).toContain('[data-component="named-override-style"][data-variant="compact"]');
    expect(compiled).toContain('color: navy');
  });

  it('scopes sparse instance-root styles exactly and preserves all layer semantics', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      variants: [{ name: 'default' }, { name: 'compact' }],
      settings: {
        breakpoints: [
          { uuid: phoneBreakpointUuid, label: 'Phone', minWidth: 390 },
          { uuid: wideBreakpointUuid, label: 'Wide', minWidth: 900 },
        ],
      },
      styles: {
        children: {
          button: {
            declarations: { color: `{token:${accentUuid}}` },
            states: { hover: { color: 'white' } },
            variants: { variant: { compact: { declarations: { color: 'purple' } } } },
            breakpoints: { [wideBreakpointUuid]: { declarations: { color: 'green' } } },
          },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'button', type: 'instance', component: 'control' }],
      },
    };
    const compiled = compileDocument(document, {
      globalTokens: exampleCatalog.tokens,
    });
    const base = compiled.find((rule) => rule.key === 'host:button:base');
    expect(base?.target).toEqual({ kind: 'node', nodeId: 'button', isInstance: true });
    expect(base?.selector).toBe(
      '[data-component="host"] > [data-node="button"][data-component="control"][data-component="control"]',
    );
    expect(base?.declarations).toContainEqual(['color', 'var(--color-accent-default)']);
    expect(compiled).toContainEqual({
      key: 'host:button:state:hover',
      target: { kind: 'node', nodeId: 'button', isInstance: true },
      selector:
        '[data-component="host"] > [data-node="button"][data-component="control"][data-component="control"]:hover',
      declarations: [['color', 'white']],
    });
    expect(compiled).toContainEqual({
      key: 'host:button:variant:variant:compact',
      target: { kind: 'node', nodeId: 'button', isInstance: true },
      selector:
        '[data-component="host"][data-variant="compact"] > [data-node="button"][data-component="control"][data-component="control"]',
      declarations: [['color', 'purple']],
    });
    expect(compiled).toContainEqual({
      key: 'host:button:style:wide',
      target: { kind: 'node', nodeId: 'button', isInstance: true },
      selector:
        '[data-component="host"] > [data-node="button"][data-component="control"][data-component="control"]',
      declarations: [['color', 'green']],
      minWidth: 900,
    });
    expect(compiled.some((rule) => rule.selector.includes('[data-node="other"]'))).toBe(false);
    expect(
      compiled.find(
        (rule) =>
          rule.key === 'host:button:base' && rule.selector.includes('[data-variant="compact"]'),
      )?.selector,
    ).toBe(
      '[data-component="host"][data-variant="compact"] > [data-node="button"][data-component="control"][data-component="control"]',
    );
    expect(
      compiled.find(
        (rule) =>
          rule.key === 'host:button:base' && !rule.selector.includes('[data-variant="compact"]'),
      )?.selector,
    ).toBe(
      '[data-component="host"] > [data-node="button"][data-component="control"][data-component="control"]',
    );
    const canvas = compileDocument(document, { address: 'canvas' });
    expect(canvas.find((rule) => rule.key === 'host:button:base')?.selector).toBe(
      '[data-id="button"][data-node="button"][data-component="control"][data-component="control"]',
    );
  });
});

describe('nested instance root appearance overrides', () => {
  it('resolves deep targets that exist only in one named child variant', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'variant-button',
      name: 'Variant button',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'button' },
    };
    const card: DocumentFile = {
      version: 1,
      id: 'variant-card',
      name: 'Variant card',
      kind: 'component',
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            insertions: [
              {
                parent: 'shell',
                node: { id: 'continue', type: 'instance', component: 'variant-button' },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'shell', type: 'frame', children: [] }],
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'variant-host',
      name: 'Variant host',
      kind: 'component',
      styles: {
        children: { 'card/shell/continue': { declarations: { backgroundColor: 'red' } } },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'card', type: 'instance', component: 'variant-card' }],
      },
    };

    const rules = compileDocument(host, { catalog: [host, card, button] });
    const rule = rules.find((entry) => entry.key === 'variant-host:card/shell/continue:base');
    expect(rule?.selector).toBe(
      '[data-component="variant-host"] > [data-node="card"] > [data-node="shell"] > [data-node="continue"][data-component="variant-button"][data-component="variant-button"]',
    );
  });

  it('emits separate exact-path rules with states, breakpoints, and variants', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'button',
      name: 'Button',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'button', children: [] },
    };
    const template: DocumentFile = {
      version: 1,
      id: 'template',
      name: 'Template',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'continue', type: 'instance', component: 'button' }],
      },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'owner',
      name: 'Owner',
      kind: 'section',
      variants: [{ name: 'tone', values: ['quiet', 'loud'], default: 'quiet' }],
      styles: {
        children: {
          'group/sign-in/continue': {
            declarations: { color: 'red' },
            states: { hover: { color: 'blue' } },
            variants: { tone: { loud: { declarations: { color: 'purple' } } } },
            breakpoints: {
              [fixtureIds.catalog.breakpoints.tablet]: { declarations: { color: 'green' } },
            },
          },
          'group/checkout/continue': { declarations: { color: 'black' } },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'group',
            type: 'frame',
            children: [
              { id: 'sign-in', type: 'instance', component: 'template' },
              { id: 'checkout', type: 'instance', component: 'template' },
            ],
          },
        ],
      },
    };
    const rules = compileDocument(owner, { catalog: [owner, template, button] });
    const signIn = rules.find((rule) => rule.key === 'owner:group/sign-in/continue:base');
    const checkout = rules.find((rule) => rule.key === 'owner:group/checkout/continue:base');
    expect(signIn?.target).toEqual({
      kind: 'nested-instance',
      targetPath: 'group/sign-in/continue',
      componentId: 'button',
    });
    expect(signIn?.selector).toContain(
      '[data-node="group"] > [data-node="sign-in"] > [data-node="continue"]',
    );
    expect(signIn?.selector).toContain('[data-component="button"]');
    expect(checkout?.selector).toContain(
      '[data-node="group"] > [data-node="checkout"] > [data-node="continue"]',
    );
    expect(signIn?.selector).not.toBe(checkout?.selector);
    expect(
      rules.find((rule) => rule.key === 'owner:group/sign-in/continue:state:hover')?.selector,
    ).toContain(':hover');
    expect(
      rules.find((rule) => rule.key === 'owner:group/sign-in/continue:variant:tone:loud')?.selector,
    ).toContain('[data-variant-tone="loud"]');
    expect(
      rules.find((rule) => rule.key === 'owner:group/sign-in/continue:style:sm')?.minWidth,
    ).toBe(768);
    const canvas = compileDocument(owner, {
      address: 'canvas',
      paintRoot: true,
      catalog: [owner, template, button],
    });
    expect(
      canvas.find((rule) => rule.key === 'owner:group/sign-in/continue:base')?.selector,
    ).toContain('[data-id="root/group/sign-in/continue"]');
  });

  it('paints canvas overrides only on the selected rendered path', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'canvas-button',
      name: 'Button',
      kind: 'atom',
      variants: [
        { name: 'default' },
        { name: 'compact' },
        { name: 'tone', values: ['quiet', 'loud'], default: 'quiet' },
      ],
      styles: {
        declarations: { backgroundColor: 'yellow' },
        variants: {
          variant: { compact: { declarations: { backgroundColor: 'purple' } } },
          tone: { loud: { declarations: { backgroundColor: 'blue' } } },
        },
      },
      root: { id: 'button-root', type: 'frame', tag: 'button' },
    };
    const template: DocumentFile = {
      version: 1,
      id: 'canvas-template',
      name: 'Template',
      kind: 'component',
      root: {
        id: 'template-root',
        type: 'frame',
        children: [
          {
            id: 'continue',
            type: 'instance',
            component: button.id,
            variants: { variant: 'compact', tone: 'loud' },
          },
        ],
      },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'canvas-owner',
      name: 'Owner',
      kind: 'section',
      styles: {
        children: {
          'group/sign-in/continue': {
            declarations: { color: 'red', backgroundColor: 'red' },
          },
          'group/checkout/continue': {
            declarations: { color: 'black', backgroundColor: 'black' },
          },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'group',
            type: 'frame',
            children: [
              { id: 'sign-in', type: 'instance', component: template.id },
              { id: 'checkout', type: 'instance', component: template.id },
            ],
          },
        ],
      },
    };
    const host = document.createElement('div');
    const styles = createStyleEngine();
    const renderer = createDomRenderer({
      parent: host,
      catalog: [owner, template, button],
      styles,
      paintRoot: true,
    });
    renderer.mount(owner);
    expect(
      host.querySelector('[data-id="root/group/sign-in/continue"]')?.getAttribute('data-component'),
    ).toBe(button.id);
    expect(
      host
        .querySelector('[data-id="root/group/checkout/continue"]')
        ?.getAttribute('data-component'),
    ).toBe(button.id);
    expect(
      getComputedStyle(host.querySelector('[data-id="root/group/sign-in/continue"]')!).color,
    ).toBe('rgb(255, 0, 0)');
    expect(
      getComputedStyle(host.querySelector('[data-id="root/group/checkout/continue"]')!).color,
    ).toBe('rgb(0, 0, 0)');
    const nestedSelector = compileDocument(owner, {
      address: 'canvas',
      paintRoot: true,
      catalog: [owner, template, button],
    }).find((rule) => rule.key === 'canvas-owner:group/sign-in/continue:base')?.selector;
    const namedVariantSelector = compileDocument(button).find((rule) =>
      rule.key.includes(':variant:variant:compact'),
    )?.selector;
    const axisVariantSelector = compileDocument(button).find((rule) =>
      rule.key.includes(':variant:tone:loud'),
    )?.selector;
    const attributeCount = (selector: string | undefined) =>
      selector?.match(/\[[^\]]+\]/g)?.length ?? 0;
    expect(nestedSelector).toContain('[data-id="root/group/sign-in/continue"]');
    expect(attributeCount(nestedSelector)).toBeGreaterThan(attributeCount(namedVariantSelector));
    expect(attributeCount(nestedSelector)).toBeGreaterThan(attributeCount(axisVariantSelector));
    renderer.destroy();
    styles.destroy();
  });
});

describe('style engine and renderer', () => {
  it('keeps instance-root overrides isolated and dominant when child rules are inserted later', () => {
    const control: DocumentFile = {
      version: 1,
      id: 'control',
      name: 'Control',
      kind: 'atom',
      variants: [{ name: 'default' }, { name: 'compact' }],
      styles: {
        declarations: { backgroundColor: 'red' },
        variants: { variant: { compact: { declarations: { backgroundColor: 'blue' } } } },
      },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'button',
        children: [{ id: 'go', type: 'text', tag: 'span', text: 'Go' }],
      },
    };
    const hostDocument: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      styles: {
        children: {
          go: { declarations: { backgroundColor: 'green' } },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'go', type: 'instance', component: 'control', variants: { variant: 'compact' } },
        ],
      },
    };
    const engine = createStyleEngine(document);
    // Deliberately insert the child component after the host stylesheet.
    engine.setDocument(hostDocument);
    engine.setDocument(control);
    const parent = document.createElement('div');
    const renderer = createDomRenderer({
      parent,
      catalog: [hostDocument, control],
      styles: engine,
    });
    renderer.mount(hostDocument);
    const root = parent.querySelector('[data-id="go"]');
    const nested = parent.querySelector('[data-id="go/go"]');
    expect(root).toBeInstanceOf(HTMLElement);
    expect(nested).toBeInstanceOf(HTMLElement);
    const localSelector =
      '[data-id="go"][data-node="go"][data-component="control"][data-component="control"]';
    expect(root?.matches(localSelector)).toBe(true);
    expect(nested?.matches(localSelector)).toBe(false);
    // jsdom currently applies source order without modeling selector specificity
    // consistently, so verify computed color after inserting the local rule last
    // and assert the stronger selector separately above.
    engine.setDocument(hostDocument);
    expect(getComputedStyle(root!).backgroundColor).toBe('rgb(0, 128, 0)');
    expect(getComputedStyle(nested!).backgroundColor).not.toBe('rgb(0, 128, 0)');
    renderer.destroy();
    engine.destroy();
  });

  it('styles a painted component root through its component selector', () => {
    const engine = createStyleEngine(document);
    const host = document.createElement('div');
    const renderer = createDomRenderer({
      parent: host,
      catalog: [formSegmented],
      styles: engine,
      paintRoot: true,
    });

    renderer.mount(formSegmented);

    const root = host.querySelector(`[data-id="${formSegmented.root.id}"]`);
    expect(root?.getAttribute('data-component')).toBe(formSegmented.id);
    const css = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(css).toContain(`[data-component="${formSegmented.id}"]`);
    expect(css).not.toContain(`[data-id="${formSegmented.root.id}"]`);
    engine.destroy();
  });

  it('uses local token fallbacks on the owner and parent sets on descendants', () => {
    const inputDoc: DocumentFile = {
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'component',
      componentTokens: {
        n_border: {
          path: 'color.border',
          type: 'color',
          value: `{token:${neutral600Uuid}}`,
        },
      },
      tokenInterface: { reads: [neutral600Uuid] },
      styles: {
        children: {
          control: {
            declarations: { border: '1px solid {color.border}' },
          },
        },
      },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'control', type: 'frame', tag: 'input' }],
      },
    };
    const css = text(compileDocument(inputDoc, { globalTokens: exampleCatalog.tokens }));
    expect(css).toContain('border: 1px solid var(--input-color-border, var(--color-neutral-600))');
    expect(css).not.toMatch(/\[data-component="input"\][^{]*--input-color-border:/);
  });

  it('paints token sets and updates a style rule without replacing the element', () => {
    const engine = createStyleEngine(document);
    const accentUuid = fixtureIds.tokens.color.accent.default;
    engine.setDesign({ tokens: exampleCatalog.tokens });
    const card: DocumentFile = {
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      tokenInterface: {
        reads: [accentUuid],
        sets: {
          [accentUuid]: '#1d4ed8',
          'input.color.border': `{token:${accentUuid}}`,
        },
      },
      styles: {
        declarations: { background: `{token:${accentUuid}}` },
      },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'article',
        children: [{ id: 'title', type: 'text', tag: 'h2', text: 'Hello' }],
      },
    };
    const page: DocumentFile = {
      version: 1,
      id: 'page',
      name: 'Page',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'card', type: 'instance', component: 'card' }],
      },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({
      parent: host,
      catalog: [page, card],
      styles: engine,
    });
    renderer.mount(page);
    const title = host.querySelector('[data-id="card/title"]');
    expect(title).toBeInstanceOf(HTMLElement);
    const sheet = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(sheet).toContain('--color-accent-default: #1d4ed8');
    expect(sheet).toContain('--input-color-border: var(--color-accent-default)');
    expect(sheet).toContain('background: var(--color-accent-default)');

    const store = createDocumentStore(card);
    renderer.connect(store);
    store.execute({
      type: 'setStyle',
      nodeId: 'title',
      property: 'color',
      value: `{token:${accentUuid}}`,
    });
    expect(host.querySelector('[data-id="card/title"]')).toBe(title);
    expect(title?.textContent).toBe('Hello');
    const next = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(next).toContain('color: var(--color-accent-default)');
    engine.destroy();
  });

  it('patches one node and leaves its sibling element in place', () => {
    const page: DocumentFile = {
      version: 1,
      id: 'page',
      name: 'Page',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'a', type: 'text', tag: 'span', text: 'A' },
          { id: 'b', type: 'text', tag: 'span', text: 'B' },
        ],
      },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({ parent: host, catalog: [page] });
    renderer.mount(page);
    const sibling = host.querySelector('[data-id="b"]');
    const store = createDocumentStore(page);
    renderer.connect(store);
    store.execute({ type: 'setProp', nodeId: 'a', prop: 'text', value: 'Changed' });
    expect(host.querySelector('[data-id="a"]')?.textContent).toBe('Changed');
    expect(host.querySelector('[data-id="b"]')).toBe(sibling);
    store.execute({
      type: 'insert',
      parentId: 'root',
      node: { id: 'c', type: 'text', tag: 'span', text: 'C' },
    });
    expect(host.querySelector('[data-id="c"]')?.textContent).toBe('C');
    expect(host.querySelector('[data-id="b"]')).toBe(sibling);
    store.execute({ type: 'remove', nodeId: 'a' });
    expect(host.querySelector('[data-id="a"]')).toBeNull();
    expect(host.querySelector('[data-id="b"]')).toBe(sibling);
  });

  it('updates a nested instance and keeps the frame sibling element', () => {
    const button: DocumentFile = {
      version: 1,
      id: 'button',
      name: 'Button',
      kind: 'atom',
      root: { id: 'root', type: 'text', tag: 'span', text: 'Hello' },
    };
    const page: DocumentFile = {
      version: 1,
      id: 'page',
      name: 'Page',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'row',
            type: 'frame',
            children: [
              { id: 'go', type: 'instance', component: 'button' },
              { id: 'note', type: 'text', tag: 'span', text: 'Note' },
            ],
          },
        ],
      },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({ parent: host, catalog: [page, button] });
    renderer.mount(page);
    const note = host.querySelector('[data-id="row/note"]');
    expect(host.querySelector('[data-id="row/go"]')?.textContent).toBe('Hello');
    const store = createDocumentStore(button);
    renderer.connect(store);
    store.execute({ type: 'setProp', nodeId: 'root', prop: 'text', value: 'Updated' });
    expect(host.querySelector('[data-id="row/go"]')?.textContent).toBe('Updated');
    expect(host.querySelector('[data-id="row/note"]')).toBe(note);
    renderer.destroy();
  });

  it('emits absolute placement only when position is absolute', () => {
    const doc: DocumentFile = {
      version: 1,
      id: 'abs',
      name: 'Absolute',
      kind: 'atom',
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        children: [
          {
            id: 'pin',
            type: 'text',
            tag: 'span',
            text: 'Pin',
            layout: { position: 'absolute', x: 12, y: 4, width: { mode: 'fixed', size: 80 } },
          },
        ],
      },
    };
    const css = text(compileDocument(doc));
    expect(css).toContain('[data-component="abs"] [data-node="pin"]');
    expect(css).toContain('position: absolute');
    expect(css).toContain('left: 12px');
    expect(css).toContain('top: 4px');
    expect(css).toContain('width: 80px');
    const flow = text(
      compileDocument({
        ...doc,
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'pin', type: 'text', tag: 'span', text: 'Pin' }],
        },
      }),
    );
    expect(flow).not.toContain('position: absolute');
  });
});
