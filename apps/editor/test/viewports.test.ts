/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import {
  createLibrarySchema,
  resetSchemaLibrary,
  setComponentSchemaUse,
} from '../src/domain/schema-library.js';
import { createViewportBoard } from '../src/domain/viewports.js';

const section: DocumentFile = {
  version: 1,
  id: 'sheet',
  name: 'Sheet',
  kind: 'section',
  root: {
    id: 'root',
    type: 'frame',
    tag: 'div',
    children: [{ id: 'title', type: 'text', tag: 'h1', text: 'Before' }],
  },
};

describe('viewport board', () => {
  it('applies section layout styles and live edits when painting its root', () => {
    const source: DocumentFile = {
      ...section,
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'cards',
            type: 'frame',
            layout: {
              direction: 'column',
              breakpoints: { desktop: { direction: 'row' } },
            },
            children: [
              { id: 'notes', type: 'text', text: 'Field notes' },
              { id: 'signin', type: 'text', text: 'Sign in' },
            ],
          },
        ],
      },
    };
    const store = createDocumentStore(source);
    const parent = document.createElement('div');
    document.body.append(parent);
    const board = createViewportBoard({
      parent,
      documents: [source],
      page: source,
      stores: [store],
      paintRoot: true,
      design: {},
    });

    for (const frame of board.frames()) {
      const doc = frame.host.contentDocument();
      const cards = doc.querySelector<HTMLElement>('[data-node="cards"]')!;
      expect(doc.querySelector('[data-component="sheet"]')).not.toBeNull();
      expect(doc.defaultView!.getComputedStyle(cards).display).toBe('flex');
      expect(doc.defaultView!.getComputedStyle(cards).flexDirection).toBe('column');
      expect(
        [...frame.styles.controller.sheet.cssRules].map((rule) => rule.cssText).join('\n'),
      ).toContain('flex-direction: row');
    }

    store.execute({
      type: 'setProp',
      nodeId: 'cards',
      prop: 'layout',
      value: { direction: 'row', breakpoints: { desktop: { direction: 'row' } } },
    });
    for (const frame of board.frames()) {
      const doc = frame.host.contentDocument();
      const cards = doc.querySelector<HTMLElement>('[data-node="cards"]')!;
      expect(doc.defaultView!.getComputedStyle(cards).display).toBe('flex');
      const rule = [...frame.styles.controller.sheet.cssRules].find(
        (candidate) =>
          candidate instanceof doc.defaultView!.CSSStyleRule &&
          cards.matches(candidate.selectorText),
      ) as CSSStyleRule | undefined;
      expect(rule?.style.getPropertyValue('flex-direction')).toBe('row');
    }

    board.destroy();
    store.destroy();
    parent.remove();
  });

  it('gives each breakpoint its own iframe, renderer, and style engine on one store', async () => {
    const store = createDocumentStore(section);
    const parent = document.createElement('div');
    document.body.append(parent);
    const board = createViewportBoard({
      parent,
      documents: [section],
      page: section,
      stores: [store],
      design: {
        breakpoints: [
          { id: 'mobile', minWidth: 375 },
          { id: 'tablet', minWidth: 768 },
          { id: 'desktop', minWidth: 1440 },
        ],
        tokens: {
          color: { $type: 'color', ink: { $value: '#112233' } },
        },
      },
    });

    const frames = board.frames();
    expect(frames.map((frame) => frame.breakpoint.minWidth)).toEqual([375, 768, 1440]);
    expect(new Set(frames.map((frame) => frame.styles)).size).toBe(3);
    expect(new Set(frames.map((frame) => frame.renderer)).size).toBe(3);

    for (const frame of frames) {
      expect(frame.host.element.style.width).toBe(`${frame.breakpoint.minWidth}px`);
      expect(frame.host.contentDocument().querySelector('[data-id="title"]')?.textContent).toBe(
        'Before',
      );
      const css = [...frame.styles.controller.sheet.cssRules]
        .map((rule) => rule.cssText)
        .join('\n');
      expect(css).toContain('--color-ink');
      expect(css).not.toContain('min-width: 375px');
    }

    store.execute({ type: 'setProp', nodeId: 'title', prop: 'text', value: 'After' });
    for (const frame of frames) {
      expect(frame.host.contentDocument().querySelector('[data-id="title"]')?.textContent).toBe(
        'After',
      );
    }

    store.execute({
      type: 'setBreakpoints',
      breakpoints: [{ id: 'narrow', minWidth: 320 }],
    });
    await Promise.resolve();
    expect(board.frames().map((frame) => frame.host.element.style.width)).toEqual(['320px']);
    expect(
      board.frames()[0]?.host.contentDocument().querySelector('[data-id="title"]')?.textContent,
    ).toBe('After');

    board.destroy();
    store.destroy();
    parent.remove();
  });

  it('updates design CSS without rebuilding frames when breakpoints stay put', async () => {
    const store = createDocumentStore(section);
    const parent = document.createElement('div');
    document.body.append(parent);
    const breakpoints = [
      { id: 'mobile', minWidth: 375 },
      { id: 'tablet', minWidth: 768 },
      { id: 'desktop', minWidth: 1440 },
    ];
    const board = createViewportBoard({
      parent,
      documents: [section],
      page: section,
      stores: [store],
      design: { breakpoints, tokens: { color: { $type: 'color', ink: { $value: '#112233' } } } },
    });
    const first = board.frames()[0]?.host.element;
    board.setDesign({
      breakpoints,
      tokens: { color: { $type: 'color', ink: { $value: '#abcdef' } } },
    });
    await Promise.resolve();
    expect(board.frames()[0]?.host.element).toBe(first);
    const css = [...(board.frames()[0]?.styles.controller.sheet.cssRules ?? [])]
      .map((rule) => rule.cssText)
      .join('\n');
    expect(css).toContain('#abcdef');
    board.destroy();
    store.destroy();
    parent.remove();
  });

  it('paints schema assignment defaults and updates them when the library changes', () => {
    resetSchemaLibrary();
    const schema = createLibrarySchema('Input');
    const source: DocumentFile = {
      version: 1,
      id: 'form-input',
      name: 'Input',
      kind: 'atom',
      fields: [
        { name: 'value', type: 'text' },
        { name: 'placeholder', type: 'text' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        bindings: [
          { field: 'value', target: 'attribute', name: 'value' },
          { field: 'placeholder', target: 'attribute', name: 'placeholder' },
        ],
      },
    };
    setComponentSchemaUse(source.id, {
      direct: { kind: 'schema', schemaId: schema.id },
      defaults: { placeholder: 'Email address' },
    });
    const store = createDocumentStore(source);
    const parent = document.createElement('div');
    document.body.append(parent);
    const board = createViewportBoard({
      parent,
      documents: [source],
      page: source,
      stores: [store],
      paintRoot: true,
      design: {},
    });

    const input = () => board.frames()[0]?.host.contentDocument().querySelector('input');
    expect(input()?.getAttribute('placeholder')).toBe('Email address');
    expect(input()?.hasAttribute('value')).toBe(false);

    setComponentSchemaUse(source.id, {
      direct: { kind: 'schema', schemaId: schema.id },
      defaults: { placeholder: 'Your name' },
    });
    expect(input()?.getAttribute('placeholder')).toBe('Your name');

    board.destroy();
    store.destroy();
    parent.remove();
    resetSchemaLibrary();
  });
});
