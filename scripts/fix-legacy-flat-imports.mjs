/**
 * Repair import paths under packages/core/src/legacy/flat after the move from controller/.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../packages/core/src/legacy/flat');

function depthToSrc(file) {
  const rel = path.relative(root, file);
  const segments = rel.split(path.sep);
  return segments.length; // file name counts; commands/apply.ts => 3 segments => 3 ups to flat, +1 legacy, +1 src = 5?
}

function ups(n) {
  return '../'.repeat(n);
}

function fixFile(file) {
  const rel = path.relative(root, path.dirname(file));
  const depth = rel === '' ? 0 : rel.split(path.sep).length;
  // legacy/flat/<...>/file.ts needs (depth + 2) hops to reach src/
  const toSrc = depth + 2;

  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  text = text.replace(/from '\.\.\/\.\.\/variants\//g, `from '${ups(depth)}variants/`);
  text = text.replace(/from '\.\.\/\.\.\/style\//g, `from '${ups(toSrc)}controller/style/`);
  text = text.replace(/from '\.\.\/\.\.\/validation\//g, `from '${ups(toSrc)}controller/validation/`);
  text = text.replace(/from '\.\.\/\.\.\/\.\.\/document\//g, `from '${ups(toSrc)}document/`);
  text = text.replace(/from '\.\.\/\.\.\/document\//g, `from '${ups(toSrc)}document/`);
  text = text.replace(/from '\.\.\/\.\.\/\.\.\/schema\//g, `from '${ups(toSrc)}schema/`);

  if (text !== before) fs.writeFileSync(file, text, 'utf8');
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (ent.name.endsWith('.ts')) fixFile(full);
  }
}

walk(root);
console.log('Legacy flat import paths updated.');
