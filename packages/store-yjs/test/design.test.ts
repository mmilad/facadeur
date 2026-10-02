import { describe, expect, it } from 'vitest';
import { toFlat } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import { createProjectTemplateDocument, loadTokens } from '@facadeur/tokens';

describe('tokens and fonts in the Yjs document', () => {
  const file = createProjectTemplateDocument();

  it('loads the template without making that load undoable', () => {
    const store = createDocumentStore(file);
    expect(store.getDocument()).toEqual(toFlat(file));
    expect(loadTokens(store.getDocument()).properties.length).toBeGreaterThan(0);
    expect(store.canUndo()).toBe(false);
    store.destroy();
  });

  it('edits tokens, fonts, and breakpoints as separate undo steps', () => {
    const store = createDocumentStore(file);
    store.execute({
      type: 'setToken',
      path: 'color.blue.500',
      token: { $value: '#0000ff', $description: 'Changed' },
    });
    store.execute({
      type: 'setFont',
      font: {
        id: 'mono',
        family: 'JetBrains Mono',
        weights: [400],
        source: { type: 'google', family: 'JetBrains Mono' },
        fallbacks: ['ui-monospace', 'monospace'],
      },
    });
    expect(() =>
      store.execute({
        type: 'setBreakpoints',
        breakpoints: [{ id: 'phone', minWidth: 390 }],
      }),
    ).toThrow(/unknown breakpoint "(?:sm|xl)"/);
    store.execute({
      type: 'setBreakpoints',
      breakpoints: [
        { id: 'xs', minWidth: 390 },
        { id: 'sm', minWidth: 800 },
        { id: 'xl', minWidth: 1600 },
      ],
    });
    expect(store.getDocument().fonts.map((font) => font.id)).toEqual(['sans', 'mono']);
    expect(store.getDocument().settings.breakpoints).toEqual([
      { id: 'xs', minWidth: 390 },
      { id: 'sm', minWidth: 800 },
      { id: 'xl', minWidth: 1600 },
    ]);

    store.undo();
    expect(store.getDocument().settings.breakpoints).toEqual([
      { id: 'xs', label: 'Phone', minWidth: 375 },
      { id: 'sm', label: 'Tablet', minWidth: 768 },
      { id: 'md', label: 'Laptop', minWidth: 1024 },
      { id: 'lg', label: 'Desktop', minWidth: 1200 },
      { id: 'xl', label: 'Wide', minWidth: 1440 },
      { id: 'xxl', label: 'Ultra', minWidth: 1760 },
    ]);
    store.undo();
    expect(store.getDocument().fonts).toHaveLength(1);
    store.undo();
    expect(store.getDocument()).toEqual(toFlat(file));
    expect(store.canUndo()).toBe(false);
    store.redo();
    expect(store.getDocument().tokens).toMatchObject({
      color: { blue: { '500': { $value: '#0000ff' } } },
    });
    store.destroy();
  });

  it('persists disabled viewports on breakpoints', () => {
    const store = createDocumentStore(file);
    const breakpoints = store.getDocument().settings.breakpoints!;
    store.execute({
      type: 'setBreakpoints',
      breakpoints: breakpoints.map((item) =>
        item.id === 'xxl' ? { ...item, enabled: false } : item,
      ),
    });
    expect(store.getDocument().settings.breakpoints?.find((item) => item.id === 'xxl')).toEqual({
      id: 'xxl',
      label: 'Ultra',
      minWidth: 1760,
      enabled: false,
    });
    store.destroy();
  });

  it('refuses a cycle or a missing reference and leaves the document unchanged', () => {
    const store = createDocumentStore(file);
    const before = store.getDocument();
    expect(() =>
      store.execute({
        type: 'setToken',
        path: 'color.loop',
        token: { $type: 'color', $value: '{color.loop}' },
      }),
    ).toThrow(/Cycle in token references: color\.loop → color\.loop/);
    expect(() =>
      store.execute({
        type: 'setToken',
        path: 'color.missing',
        token: { $type: 'color', $value: '{color.nope}' },
      }),
    ).toThrow(/Missing token "\{color\.nope\}"/);
    expect(store.getDocument()).toEqual(before);
    expect(store.canUndo()).toBe(false);
    store.destroy();
  });
});
