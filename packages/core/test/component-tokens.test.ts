import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  assertComponentTokenDefault,
  componentTokenPublicPath,
  DocumentError,
  toFlat,
  toNested,
  validateCatalog,
} from '@facadeur/core';
import type { DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';

const globals = new Set(['color.accent.default', 'color.bg.canvas', 'color.neutral.600']);

describe('component tokens', () => {
  it('round-trips componentTokens through flat and nested', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'component',
      componentTokens: {
        'color.border': { type: 'color', value: '{color.neutral.600}' },
      },
      tokenInterface: { reads: ['color.neutral.600'] },
      root: { id: 'root', type: 'frame', tag: 'div' },
    };
    expect(toNested(toFlat(file))).toEqual(file);
  });

  it('adopts global refs from defaults but not local style refs', () => {
    const base = toFlat({
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'component',
      styles: { declarations: { borderColor: '{color.border}' } },
      root: { id: 'root', type: 'frame', tag: 'div' },
    });
    const next = applyCommand(
      base,
      {
        type: 'setComponentToken',
        path: 'color.border',
        token: { type: 'color', value: '{color.neutral.600}' },
      },
      { globalTokenPaths: globals },
    );
    expect(next.tokenInterface?.reads).toEqual(['color.neutral.600']);
    expect(next.tokenInterface?.reads).not.toContain('color.border');
  });

  it('rejects local-to-local defaults and page documents', () => {
    expect(() => assertComponentTokenDefault('{color.border}', globals)).toThrow(DocumentError);
    expect(() =>
      applyCommand(
        toFlat({
          version: 1,
          id: 'page',
          name: 'Page',
          kind: 'page',
          root: { id: 'root', type: 'frame', children: [] },
        }),
        {
          type: 'setComponentToken',
          path: 'color.bg',
          token: { type: 'color', value: '{color.bg.canvas}' },
        },
        { globalTokenPaths: globals },
      ),
    ).toThrow(/Page documents cannot define component tokens/);
  });

  it('validates sets keys against catalog component tokens', () => {
    const catalog = [
      {
        version: 1,
        id: 'project-template',
        name: 'Design',
        kind: 'atom',
        tokens: { color: { $type: 'color', accent: { default: { $value: '#00f' } } } },
        root: { id: 'root', type: 'frame', tag: 'div' },
      },
      {
        version: 1,
        id: 'input',
        name: 'Input',
        kind: 'component',
        componentTokens: {
          'color.border': { type: 'color', value: '{color.accent.default}' },
        },
        tokenInterface: { reads: ['color.accent.default'] },
        root: { id: 'root', type: 'frame', tag: 'div' },
      },
      {
        version: 1,
        id: 'parent',
        name: 'Parent',
        kind: 'component',
        tokenInterface: {
          reads: ['color.accent.default'],
          sets: { 'input.color.border': '{color.accent.default}' },
        },
        root: { id: 'root', type: 'frame', tag: 'div' },
      },
    ] as DocumentFile[];
    expect(() => validateCatalog(catalog)).not.toThrow();
    expect(componentTokenPublicPath('input', 'color.border')).toBe('input.color.border');
  });

  it('round-trips componentTokens through Yjs and undo', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'chip',
      name: 'Chip',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'span' },
    };
    const store = createDocumentStore(file, { globalTokenPaths: globals });
    store.execute({
      type: 'setComponentToken',
      path: 'color.bg',
      token: { type: 'color', value: '{color.bg.canvas}' },
    });
    expect(store.getDocument().componentTokens?.['color.bg']).toEqual({
      type: 'color',
      value: '{color.bg.canvas}',
    });
    store.execute({ type: 'removeComponentToken', path: 'color.bg' });
    expect(store.getDocument().componentTokens).toBeUndefined();
    store.destroy();
  });
});
