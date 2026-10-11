import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { runCodegen } from '../src/cli';

describe('Catalog codegen CLI', () => {
  it('reads the Catalog at the invocation directory and writes React and Storybook output', () => {
    const directory = mkdtempSync(join(tmpdir(), 'facadeur-codegen-'));
    const previousInitCwd = process.env.INIT_CWD;
    process.env.INIT_CWD = directory;
    try {
      const catalog = createExampleCatalog();
      const button = Object.values(catalog.atoms).find(
        (definition) => definition.name === 'Button',
      )!;
      writeFileSync(join(directory, 'catalog.json'), JSON.stringify(catalog));

      runCodegen([
        '--catalog',
        'catalog.json',
        '--out',
        'ui',
        '--storybook',
        'storybook',
        '--entries',
        button.uuid,
      ]);

      expect(readFileSync(join(directory, 'ui/components/button/index.tsx'), 'utf8')).toContain(
        'export function Button',
      );
      expect(
        readFileSync(join(directory, 'storybook/src/stories/generated/button.stories.tsx'), 'utf8'),
      ).toContain("from '@facadeur/ui'");
    } finally {
      if (previousInitCwd === undefined) delete process.env.INIT_CWD;
      else process.env.INIT_CWD = previousInitCwd;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('creates a standalone pnpm workspace and removes only stale generator-owned output', () => {
    const directory = mkdtempSync(join(tmpdir(), 'facadeur-codegen-workspace-'));
    const previousInitCwd = process.env.INIT_CWD;
    process.env.INIT_CWD = directory;
    try {
      const catalog = createExampleCatalog();
      writeFileSync(join(directory, 'catalog.json'), JSON.stringify(catalog));
      writeFileSync(join(directory, 'notes.txt'), 'keep this file');

      runCodegen(['--catalog', 'catalog.json', '--workspace', 'generated', '--next-example']);

      const root = join(directory, 'generated');
      expect(readFileSync(join(root, 'package.json'), 'utf8')).toContain('build-storybook');
      expect(readFileSync(join(root, 'packages/ui/package.json'), 'utf8')).toContain(
        '"@types/react"',
      );
      expect(readFileSync(join(root, 'apps/storybook/package.json'), 'utf8')).toContain(
        '"@storybook/react"',
      );
      expect(readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8')).toContain('apps/next');
      expect(readFileSync(join(root, 'apps/next/app/page.tsx'), 'utf8')).toContain('<Button');
      expect(readFileSync(join(root, 'apps/next/app/page.tsx'), 'utf8')).toContain(
        'type ButtonProps',
      );
      expect(existsSync(join(root, 'packages/ui/styles.d.ts'))).toBe(true);
      expect(existsSync(join(root, 'packages/ui/index.ts'))).toBe(true);
      expect(
        existsSync(join(root, 'apps/storybook/src/stories/generated/button.stories.tsx')),
      ).toBe(true);
      expect(existsSync(join(root, '.facadeur-codegen-manifest.json'))).toBe(true);

      runCodegen(['--catalog', 'catalog.json', '--workspace', 'generated']);

      expect(existsSync(join(root, 'apps/next/app/page.tsx'))).toBe(false);
      expect(readFileSync(join(directory, 'notes.txt'), 'utf8')).toBe('keep this file');
    } finally {
      if (previousInitCwd === undefined) delete process.env.INIT_CWD;
      else process.env.INIT_CWD = previousInitCwd;
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects workspace mode combined with component output directories', () => {
    expect(() =>
      runCodegen(['--catalog', 'catalog.json', '--workspace', 'generated', '--out', 'ui']),
    ).toThrow('--workspace cannot be combined');
    expect(() =>
      runCodegen(['--catalog', 'catalog.json', '--next-example', '--out', 'ui']),
    ).toThrow('--next-example requires --workspace');
  });
});
