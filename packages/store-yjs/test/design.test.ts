import { describe, expect, it } from 'vitest';
import { createProjectTemplateDocument, loadTokens } from '@facadeur/tokens';
import { createDocumentStore } from '@facadeur/store-yjs';
import { toFlat, type DesignTokenRecord, type FontFamilyDefinition } from '@facadeur/core';
import { exampleIds as fixtureIds } from '@facadeur/examples';
const testUuid33 = globalThis.crypto.randomUUID();
const testUuid34 = globalThis.crypto.randomUUID();

describe('tokens and breakpoints in the Yjs document', () => {
  const file = createProjectTemplateDocument();
  const blue500Uuid = fixtureIds.tokens.color.blue._500;
  const interUuid = fixtureIds.tokens.font.inter;
  const monoUuid = testUuid33;
  const phoneUuid = fixtureIds.catalog.breakpoints.phone;
  const tabletUuid = fixtureIds.catalog.breakpoints.tablet;
  const wideUuid = fixtureIds.catalog.breakpoints.wide;

  it('loads the template without making that load undoable', () => {
    const store = createDocumentStore(file);
    expect(store.getDocument()).toEqual(toFlat(file));
    expect(loadTokens(store.getDocument()).properties.length).toBeGreaterThan(0);
    expect(store.canUndo()).toBe(false);
    store.destroy();
  });

  it('edits tokens, font tokens, and breakpoints as separate undo steps', () => {
    const store = createDocumentStore(file);
    const blue = store.getDocument().tokens.color[blue500Uuid];
    expect(blue).toBeDefined();
    store.execute({
      type: 'setToken',
      family: 'color',
      token: { ...blue!, value: '#0000ff' },
    });
    const inter = store.getDocument().tokens.font[interUuid];
    expect(inter).toBeDefined();
    const mono: FontFamilyDefinition = {
      ...inter!,
      uuid: monoUuid,
      label: 'JetBrains Mono',
      value: {
        ...inter!.value,
        family: 'JetBrains Mono',
        source: { type: 'google', family: 'JetBrains Mono' },
        fallbacks: ['ui-monospace', 'monospace'],
      },
    };
    store.execute({ type: 'setToken', family: 'font', token: mono });

    expect(() =>
      store.execute({
        type: 'setBreakpoints',
        breakpoints: [{ uuid: phoneUuid, label: 'Phone', minWidth: 390 }],
      }),
    ).toThrow(/unknown breakpoint/);

    store.execute({
      type: 'setBreakpoints',
      breakpoints: [
        { uuid: phoneUuid, label: 'Phone', minWidth: 390 },
        { uuid: tabletUuid, label: 'Tablet', minWidth: 800 },
        { uuid: wideUuid, label: 'Wide', minWidth: 1600 },
      ],
    });
    expect(store.getDocument().tokens.font[monoUuid]?.label).toBe('JetBrains Mono');
    expect(store.getDocument().settings.breakpoints).toEqual([
      { uuid: phoneUuid, label: 'Phone', minWidth: 390 },
      { uuid: tabletUuid, label: 'Tablet', minWidth: 800 },
      { uuid: wideUuid, label: 'Wide', minWidth: 1600 },
    ]);

    store.undo();
    expect(store.getDocument().settings.breakpoints).toEqual(file.settings?.breakpoints);
    store.undo();
    expect(store.getDocument().tokens.font[monoUuid]).toBeUndefined();
    store.undo();
    expect(store.getDocument()).toEqual(toFlat(file));
    expect(store.canUndo()).toBe(false);
    store.redo();
    expect(store.getDocument().tokens.color[blue500Uuid]?.value).toBe('#0000ff');
    store.destroy();
  });

  it('persists disabled viewports by UUID', () => {
    const store = createDocumentStore(file);
    const breakpoints = store.getDocument().settings.breakpoints!;
    const ultraUuid = fixtureIds.catalog.breakpoints.ultra;
    store.execute({
      type: 'setBreakpoints',
      breakpoints: breakpoints.map((item) =>
        item.uuid === ultraUuid ? { ...item, enabled: false } : item,
      ),
    });
    expect(store.getDocument().settings.breakpoints?.find((item) => item.uuid === ultraUuid)).toEqual({
      uuid: ultraUuid,
      label: 'Ultra',
      minWidth: 1760,
      enabled: false,
    });
    store.destroy();
  });

  it('rejects invalid token values without changing the document', () => {
    const store = createDocumentStore(file);
    const before = store.getDocument();
    const invalidToken: DesignTokenRecord = {
      uuid: testUuid34,
      label: 'Broken',
      group: '',
      valueType: 'color',
      value: 'not a CSS color',
    };
    expect(() =>
      store.execute({ type: 'setToken', family: 'color', token: invalidToken }),
    ).toThrow(/must be a CSS color/);
    expect(store.getDocument()).toEqual(before);
    expect(store.canUndo()).toBe(false);
    store.destroy();
  });
});
