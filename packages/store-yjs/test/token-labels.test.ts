import { describe, expect, it } from 'vitest';
import { readTokenTree, toNested, type DocumentFile } from '@facadeur/core';
import * as Y from 'yjs';
import { createDocumentStore } from '../src/index';
const testUuid37 = globalThis.crypto.randomUUID();

const brandUuid = testUuid37;

describe('saved token labels', () => {
  it('preserves global and local labels through JSON, Yjs hydration and label Undo/Redo', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'labels',
      name: 'Labels',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: {
        color: {
          [brandUuid]: {
            uuid: brandUuid,
            label: 'Brand',
            group: '',
            valueType: 'color',
            value: '#123456',
          },
        },
        space: {},
        radius: {},
        shadow: {},
        type: {},
        font: {},
      },
      componentTokens: {
        n_surface: { path: 'color.surface', type: 'color', value: '#123456', label: 'Surface' },
      },
      styles: { declarations: { background: '{color.surface}' } },
    };
    const store = createDocumentStore(file);
    const hydrated = createDocumentStore(
      file,
      { globalTokenUuids: new Set([brandUuid]) },
      { update: Y.encodeStateAsUpdate(store.doc) },
    );
    try {
      expect(JSON.parse(JSON.stringify(toNested(hydrated.getDocument())))).toEqual(file);
      hydrated.execute({
        type: 'setComponentToken',
        id: 'n_surface',
        path: 'color.surface',
        token: { type: 'color', value: '#123456', label: 'Background' },
      });
      expect(hydrated.getDocument().componentTokens?.n_surface?.label).toBe('Background');
      hydrated.undo();
      expect(hydrated.getDocument().componentTokens?.n_surface?.label).toBe('Surface');
      hydrated.redo();
      expect(hydrated.getDocument().componentTokens?.n_surface?.label).toBe('Background');
      expect(hydrated.getDocument().styles).toEqual(file.styles);
      expect(readTokenTree(hydrated.getDocument().tokens).tokens.get(brandUuid)?.label).toBe(
        'Brand',
      );
    } finally {
      hydrated.destroy();
      store.destroy();
    }
  });
});
