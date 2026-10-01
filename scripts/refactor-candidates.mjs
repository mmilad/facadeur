import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'generated',
  'test',
  'tests',
  '__tests__',
  'fixtures',
]);
const extensions = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;
const files = new Set();
const directories = new Map();

function maintainedSource(path) {
  return extensions.test(path) && !/\.(?:test|spec|d)\.[cm]?[jt]sx?$/.test(path);
}

function visit(path) {
  const local = relative(root, path).replaceAll('\\', '/');
  if (local.split('/').some((segment) => ignored.has(segment))) return;
  if (local === 'packages/ui' || local.startsWith('packages/ui/')) return;
  if (statSync(path).isDirectory()) {
    const entries = readdirSync(path, { withFileTypes: true });
    const directFiles = entries.filter((entry) => entry.isFile() && maintainedSource(entry.name));
    if (directFiles.length >= 12) directories.set(local, directFiles.length);
    for (const entry of entries) {
      if (entry.isSymbolicLink() || ignored.has(entry.name)) continue;
      visit(resolve(path, entry.name));
    }
  } else if (maintainedSource(path)) {
    files.add(path);
  }
}

const inputs = process.argv.slice(2);
if (inputs.length) {
  for (const input of inputs) {
    const path = resolve(root, input);
    if (!existsSync(path)) throw new Error(`Path does not exist: ${input}`);
    visit(path);
  }
} else {
  for (const group of ['apps', 'packages']) {
    for (const entry of readdirSync(resolve(root, group), { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const source = resolve(root, group, entry.name, 'src');
      if (existsSync(source)) visit(source);
    }
  }
}

const candidates = [...files]
  .map((path) => {
    const source = readFileSync(path, 'utf8');
    const lines = source ? source.split(/\r?\n/).length - (source.endsWith('\n') ? 1 : 0) : 0;
    return { path: relative(root, path).replaceAll('\\', '/'), lines };
  })
  .filter(({ lines }) => lines >= 450)
  .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));

console.log('Refactoring candidates (review signals; no automatic edits or failing size gate):');
for (const candidate of candidates) {
  console.log(
    `${candidate.lines >= 700 ? 'REVIEW BEFORE EXTENDING' : 'REVIEW'} | ${candidate.lines} lines | ${candidate.path}`,
  );
}
if (!candidates.length)
  console.log('No size candidates. Still check responsibility and duplication signals.');
if (directories.size) {
  console.log(
    '\nDirectory concentration (review domain ownership; file count alone does not require folders):',
  );
  for (const [path, count] of [...directories].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`REVIEW ORGANIZATION | ${count} direct source files | ${path}`);
  }
}
