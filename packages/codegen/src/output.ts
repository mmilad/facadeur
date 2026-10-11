import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { GeneratedFile } from './types';

const MANIFEST = '.facadeur-codegen-manifest.json';

interface OutputManifest {
  readonly version: 1;
  readonly files: readonly string[];
}

/** Write only generator-owned paths and remove stale paths recorded by its last run. */
export function writeGeneratedFiles(directory: string, files: readonly GeneratedFile[]) {
  const root = resolve(directory);
  const desired = new Map(files.map((file) => [safeRelativePath(file.path), file.contents]));
  const previous = readManifest(root);

  for (const path of previous?.files ?? []) {
    const safePath = safeRelativePath(path);
    if (desired.has(safePath)) continue;
    const target = targetPath(root, safePath);
    if (!existsSync(target)) continue;
    rmSync(target);
    removeEmptyParents(dirname(target), root);
  }

  for (const [path, contents] of desired) {
    const target = targetPath(root, path);
    mkdirSync(dirname(target), { recursive: true });
    if (!existsSync(target) || readFileSync(target, 'utf8') !== contents) {
      writeFileSync(target, contents, 'utf8');
    }
  }

  mkdirSync(root, { recursive: true });
  const manifest: OutputManifest = {
    version: 1,
    files: [...desired.keys()].sort((left, right) => left.localeCompare(right, 'en')),
  };
  writeFileSync(resolve(root, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function readManifest(root: string): OutputManifest | undefined {
  const path = resolve(root, MANIFEST);
  if (!existsSync(path)) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`Invalid codegen manifest "${path}"`);
  }
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('files' in value) ||
    !Array.isArray(value.files) ||
    value.files.some((file) => typeof file !== 'string')
  ) {
    throw new Error(`Invalid codegen manifest "${path}"`);
  }
  return value as OutputManifest;
}

function safeRelativePath(path: string) {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\/+/, '');
  if (!normalized || isAbsolute(path) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Generated path must stay inside its output directory: "${path}"`);
  }
  return normalized;
}

function targetPath(root: string, path: string) {
  const target = resolve(root, path);
  const fromRoot = relative(root, target);
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error(`Generated path must stay inside its output directory: "${path}"`);
  }
  return target;
}

function removeEmptyParents(start: string, root: string) {
  let current = start;
  while (current !== root && existsSync(current) && readdirSync(current).length === 0) {
    rmdirSync(current);
    current = dirname(current);
  }
}
