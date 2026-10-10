/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createStyleEngine, type CompiledRule } from '@facadeur/style-engine';
import { compileDocument } from '@facadeur/style-engine';
import type { DocumentFile } from '@facadeur/core';
import { exampleCatalog, exampleIds as fixtureIds } from '@facadeur/examples';
import { documentFromExample } from './helpers/example-document';

const accentUuid = fixtureIds.tokens.color.accent.default;
const neutral600Uuid = fixtureIds.tokens.color.neutral._600;
const phoneBreakpointUuid = fixtureIds.catalog.breakpoints.phone;
const wideBreakpointUuid = fixtureIds.catalog.breakpoints.wide;
const button = documentFromExample(exampleCatalog.atoms[fixtureIds.components.button.definition]!);
const formSegmented = documentFromExample(
  exampleCatalog.components[fixtureIds.components.formSegmented.definition]!,
);
const formInput = documentFromExample(
  exampleCatalog.atoms[fixtureIds.components.formInput.definition]!,
);
const textarea = documentFromExample(
  exampleCatalog.components[fixtureIds.components.textarea.definition]!,
);
const canvasFrame: DocumentFile = {
  version: 1,
  id: 'canvas-frame',
  name: 'Canvas frame',
  kind: 'component',
  root: { id: 'canvas-frame-root', type: 'frame', layout: { direction: 'row' } },
};

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
    engine.setDocument(canvasFrame, { address: 'canvas', paintRoot: true });
    const css = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(css).toContain(`[data-id="${canvasFrame.root.id}"]`);
    expect(css).toContain('display: flex');
    engine.setDocument(canvasFrame, { address: 'canvas' });
    const kept = [...engine.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n');
    expect(kept).toContain(`[data-id="${canvasFrame.root.id}"]`);
    engine.destroy();
  });

  it('emits the frame root on the canvas only when paintRoot is set', () => {
    const painted = text(compileDocument(canvasFrame, { address: 'canvas', paintRoot: true }));
    expect(painted).toContain(`[data-id="${canvasFrame.root.id}"]`);
    expect(painted).toContain('display: flex');
    const hidden = text(compileDocument(canvasFrame, { address: 'canvas' }));
    expect(hidden).not.toContain(`[data-id="${canvasFrame.root.id}"]`);
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
      key: `host:button:style:${wideBreakpointUuid}`,
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
      rules.find(
        (rule) =>
          rule.key ===
          `owner:group/sign-in/continue:style:${fixtureIds.catalog.breakpoints.tablet}`,
      )?.minWidth,
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
});

describe('style engine and renderer', () => {
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
