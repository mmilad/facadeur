import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/** Format generated source with the repository Prettier config. */
export async function formatGenerated(path: string, contents: string): Promise<string> {
  const configPath = resolve(repoRoot, '.prettierrc.json');
  const config = (await prettier.resolveConfig(configPath)) ?? {};
  return prettier.format(contents, { ...config, filepath: path });
}

export function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}
