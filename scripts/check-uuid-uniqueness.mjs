import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.jsonc',
  '.md',
  '.template',
  '.yaml',
  '.yml',
  '.css',
  '.html',
  '.log',
  '.txt',
]);
const sourceFiles = new Set(['.gitignore', '.prettierignore']);
const ignoredDirectories = new Set([
  '.git',
  '.facadeur',
  'node_modules',
  '.next',
  'dist',
  'coverage',
  'storybook-static',
]);
const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const locations = new Map();
const nonExampleIdLists = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (
      entry.isFile() &&
      (sourceExtensions.has(path.extname(entry.name)) || sourceFiles.has(entry.name))
    ) {
      scan(absolute);
    }
  }
}

function scan(file) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(uuidPattern)) {
    const uuid = match[0].toLowerCase();
    const relativePath = path.relative(root, file).replaceAll(path.sep, '/');
    const line = text.slice(0, match.index).split('\n').length;
    const matches = locations.get(uuid) ?? [];
    const location = `${relativePath}:${line}`;
    matches.push(location);
    locations.set(uuid, matches);
    if (!/^packages\/examples\/src\/.+\/idList\.ts$/.test(relativePath)) {
      nonExampleIdLists.push(location);
    }
  }
}

walk(root);
const duplicates = [...locations]
  .filter(([, matches]) => matches.length > 1)
  .sort(([a], [b]) => a.localeCompare(b));

if (duplicates.length || nonExampleIdLists.length) {
  if (nonExampleIdLists.length) {
    console.error('UUID literals must be declared in packages/examples/src/**/idList.ts:');
    for (const location of nonExampleIdLists.sort()) console.error(`  ${location}`);
  }

  if (duplicates.length) {
    console.error(`Found ${duplicates.length} UUIDs declared more than once:`);
    for (const [uuid, matches] of duplicates) console.error(`  ${uuid}: ${matches.join(', ')}`);
  }
  process.exitCode = 1;
} else {
  console.log(`UUID uniqueness OK (${locations.size} static UUIDs, each declared once).`);
}
