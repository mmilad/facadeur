import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { validateCatalog, validateDocumentFile } from '@facadeur/core';
import { designFromDocument, generateReact } from './generate.js';
import { formatGenerated } from './format.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let designPath: string | undefined;
  let out: string | undefined;
  const files: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--design') designPath = args[(index += 1)];
    else if (arg === '--out') out = args[(index += 1)];
    else if (arg?.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else if (arg) files.push(arg);
  }
  if (!out || files.length === 0) {
    throw new Error(
      'Usage: facadeur-codegen --out <dir> [--design <document.json>] <document.json>...',
    );
  }
  const documents = validateCatalog(files.map((file) => JSON.parse(readFileSync(file, 'utf8'))));
  const design = designPath
    ? designFromDocument(validateDocumentFile(JSON.parse(readFileSync(designPath, 'utf8'))))
    : undefined;
  const generated = generateReact({ documents, ...(design ? { design } : {}) });
  const directory = resolve(out);
  for (const file of generated) {
    const target = resolve(directory, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, await formatGenerated(file.path, file.contents));
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
