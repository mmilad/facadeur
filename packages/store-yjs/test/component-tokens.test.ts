import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '../src/index';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

describe('component tokens', () => {
  it('round-trips componentTokens through Yjs and undoes/redoes add and remove independently', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'chip',
      name: 'Chip',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'span' },
    };
    const token = {
      type: 'color' as const,
      value: fixtureTokenRef(fixtureIds.tokens.color.bg.canvas),
    };
    const id = 'n_yjstoken1';
    const store = createDocumentStore(file, {
      globalTokenUuids: new Set([
        fixtureIds.tokens.color.accent.default,
        fixtureIds.tokens.color.bg.canvas,
        fixtureIds.tokens.color.neutral._600,
      ]),
    });
    try {
      expect(store.getDocument().componentTokens).toBeUndefined();
      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);

      store.execute({
        type: 'setComponentToken',
        id,
        path: 'color.bg',
        token,
      });
      expect(store.getDocument().componentTokens).toEqual({
        [id]: { path: 'color.bg', ...token },
      });
      expect(store.canUndo()).toBe(true);

      store.execute({ type: 'removeComponentToken', id });
      expect(store.getDocument().componentTokens).toBeUndefined();

      store.undo();
      expect(store.getDocument().componentTokens).toEqual({
        [id]: { path: 'color.bg', ...token },
      });
      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(true);

      store.undo();
      expect(store.getDocument().componentTokens).toBeUndefined();
      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(true);

      store.redo();
      expect(store.getDocument().componentTokens).toEqual({
        [id]: { path: 'color.bg', ...token },
      });
      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(true);

      store.redo();
      expect(store.getDocument().componentTokens).toBeUndefined();
      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(false);
    } finally {
      store.destroy();
    }
  });
});
