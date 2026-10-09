import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  assertComponentTokenDefault,
  componentTokenPublicPath,
  createId,
  DocumentError,
  listComponentTokens,
  toFlat,
  toNested,
  validateCatalog,
} from '@facadeur/core';
import type { DocumentFile } from '@facadeur/core';
import { exampleIds as fixtureIds } from '@facadeur/examples';

const globalTokenUuids = {
  accentDefault: fixtureIds.tokens.color.accent.default,
  canvas: fixtureIds.tokens.color.bg.canvas,
  neutral600: fixtureIds.tokens.color.neutral._600,
};
const globals = new Set(Object.values(globalTokenUuids));

describe('component tokens', () => {
  it('round-trips componentTokens through flat and nested', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'component',
      componentTokens: {
        n_border1: {
          path: 'color.border',
          type: 'color',
          value: `{token:${globalTokenUuids.neutral600}}`,
          label: 'Outline',
        },
      },
      tokenInterface: { reads: [globalTokenUuids.neutral600] },
      root: { id: 'root', type: 'frame', tag: 'div' },
    };
    expect(toNested(toFlat(file))).toEqual(file);
  });

  it('migrates legacy path-keyed componentTokens on canonicalize', () => {
    const flat = toFlat({
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'component',
      componentTokens: {
        'color.border': {
          type: 'color',
          value: `{token:${globalTokenUuids.neutral600}}`,
          label: 'Outline',
        },
      } as unknown as DocumentFile['componentTokens'],
      root: { id: 'root', type: 'frame', tag: 'div' },
    });
    const tokens = listComponentTokens(flat.componentTokens);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.path).toBe('color.border');
    expect(tokens[0]?.label).toBe('Outline');
    expect(tokens[0]?.id).toMatch(/^n_/);
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
    const id = createId();
    const next = applyCommand(
      base,
      {
        type: 'setComponentToken',
        id,
        path: 'color.border',
        token: { type: 'color', value: `{token:${globalTokenUuids.neutral600}}` },
      },
      { globalTokenUuids: globals },
    );
    expect(next.tokenInterface?.reads).toEqual([globalTokenUuids.neutral600]);
    expect(next.tokenInterface?.reads).not.toContain('color.border');
  });

  it('renames a local token path and rewrites style references', () => {
    const id = createId();
    const base = toFlat({
      version: 1,
      id: 'input',
      name: 'Input',
      kind: 'component',
      componentTokens: {
        [id]: {
          path: 'color.border',
          type: 'color',
          value: `{token:${globalTokenUuids.neutral600}}`,
        },
      },
      styles: { declarations: { borderColor: '{color.border}' } },
      tokenInterface: { reads: [globalTokenUuids.neutral600] },
      root: { id: 'root', type: 'frame', tag: 'div' },
    });
    const next = applyCommand(
      base,
      {
        type: 'renameComponentTokenPath',
        id,
        path: 'color.outline',
      },
      { globalTokenUuids: globals },
    );
    expect(next.componentTokens?.[id]?.path).toBe('color.outline');
    expect(next.styles?.declarations?.borderColor).toBe('{color.outline}');
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
          id: createId(),
          path: 'color.bg',
          token: { type: 'color', value: `{token:${globalTokenUuids.canvas}}` },
        },
        { globalTokenUuids: globals },
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
        tokens: {
          color: {
            [globalTokenUuids.accentDefault]: {
              uuid: globalTokenUuids.accentDefault,
              label: 'Default',
              group: 'accent',
              valueType: 'color',
              value: '#00f',
            },
          },
          space: {},
          radius: {},
          shadow: {},
          type: {},
          font: {},
        },
        root: { id: 'root', type: 'frame', tag: 'div' },
      },
      {
        version: 1,
        id: 'input',
        name: 'Input',
        kind: 'component',
        componentTokens: {
          n_border: {
            path: 'color.border',
            type: 'color',
            value: `{token:${globalTokenUuids.accentDefault}}`,
          },
        },
        tokenInterface: { reads: [globalTokenUuids.accentDefault] },
        root: { id: 'root', type: 'frame', tag: 'div' },
      },
      {
        version: 1,
        id: 'parent',
        name: 'Parent',
        kind: 'component',
        tokenInterface: {
          reads: [globalTokenUuids.accentDefault],
          sets: { 'input.color.border': `{token:${globalTokenUuids.accentDefault}}` },
        },
        root: { id: 'root', type: 'frame', tag: 'div' },
      },
    ] as DocumentFile[];
    expect(() => validateCatalog(catalog)).not.toThrow();
    expect(componentTokenPublicPath('input', 'color.border')).toBe('input.color.border');
  });
});
