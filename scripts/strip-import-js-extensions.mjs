/**
 * Remove `.js` suffix from relative import/export specifiers (Bundler moduleResolution).
 * Skips node_modules and non-relative paths.
 */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const roots = ['packages', 'apps', 'scripts'].map((segment) => path.join(repoRoot, segment));
const skipDirs = new Set(['node_modules', 'dist', '.next', 'coverage']);

const fromRelative = /(\bfrom\s+['"])(\.\.?\/[^'"]+)\.js(['"])/g;
const exportFromRelative = /(\bexport\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+['"])(\.\.?\/[^'"]+)\.js(['"])/g;
const importCallRelative = /(\bimport\s*\(\s*['"])(\.\.?\/[^'"]+)\.js(['"]\s*\))/g;

function transform(source) {
  return source
    .replace(fromRelative, '$1$2$3')
    .replace(exportFromRelative, '$1$2$3')
    .replace(importCallRelative, '$1$2$3');
}

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|cts)$/.test(ent.name)) out.push(full);
  }
}

const files = [];
for (const root of roots) {
  if (fs.existsSync(root)) walk(root, files);
}

for (const name of ['vitest.config.ts']) {
  const full = path.join(repoRoot, name);
  if (fs.existsSync(full)) files.push(full);
}

let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changed += 1;
  }
}

console.log(`Updated ${changed} files (${files.length} scanned).`);
