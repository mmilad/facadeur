import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { GeneratedFile } from '../generate';

/** Assemble an independent workspace without changing component generation. */
export function workspaceFiles(
  ui: readonly GeneratedFile[],
  stories: readonly GeneratedFile[],
  nextExample = false,
) {
  const templates = join(dirname(fileURLToPath(import.meta.url)), 'templates');
  const files: GeneratedFile[] = [];
  function collect(directory: string, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix + entry.name.replace(/\.template$/, '');
      if (!nextExample && path === 'apps/next') continue;
      if (entry.isDirectory()) collect(join(directory, entry.name), `${path}/`);
      else files.push({ path, contents: readFileSync(join(directory, entry.name), 'utf8') });
    }
  }
  collect(templates);
  if (nextExample) {
    const root = files.find((file) => file.path === 'package.json')!;
    const manifest = JSON.parse(root.contents);
    manifest.scripts.next = 'pnpm --filter @facadeur/example-next dev';
    root.contents = JSON.stringify(manifest);
  }
  return [
    { path: '.gitignore', contents: 'node_modules/\n.next/\nstorybook-static/\n*.tsbuildinfo\n' },
    ...files,
    ...ui.map((file) => ({ ...file, path: `packages/ui/${file.path}` })),
    ...stories.map((file) => ({ ...file, path: `apps/storybook/${file.path}` })),
  ];
}
