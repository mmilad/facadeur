import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateCatalog, validateDocumentFile } from '@facadeur/core';
import { designFromDocument, generateReact } from './generate';
import { formatGenerated } from './format';
import { writeGeneratedFiles } from './generated-output';

export async function runReactCli(args: readonly string[]): Promise<void> {
  let designPath: string | undefined;
  let schemasPath: string | undefined;
  let out: string | undefined;
  let storybook: string | undefined;
  let entries: string[] | undefined;
  const files: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--design') designPath = args[(index += 1)];
    else if (arg === '--schemas') schemasPath = args[(index += 1)];
    else if (arg === '--out') out = args[(index += 1)];
    else if (arg === '--storybook') storybook = args[(index += 1)];
    else if (arg === '--entries') entries = args[(index += 1)]?.split(',');
    else if (arg?.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else if (arg) files.push(arg);
  }
  if (!out || files.length === 0) {
    throw new Error(
      'Usage: facadeur-codegen --out <ui-dir> [--storybook <app-dir>] [--design <document.json>] [--schemas <schemas.json>] <document.json>...',
    );
  }
  const rawDocuments = files.map((file) => JSON.parse(readFileSync(file, 'utf8')) as unknown);
  const designDocument = designPath
    ? validateDocumentFile(JSON.parse(readFileSync(designPath, 'utf8')))
    : undefined;
  const schemaCatalog = schemasPath
    ? readSchemaCatalog(schemasPath)
    : designDocument?.schemaCatalog;
  const documents = validateCatalog(rawDocuments, {
    ...(schemaCatalog ? { schemaCatalog } : {}),
  });
  const design = designDocument ? designFromDocument(designDocument) : undefined;
  const { ui, stories } = generateReact({
    documents,
    ...(design ? { design } : {}),
    ...(schemaCatalog ? { schemaCatalog } : {}),
    entries,
  });
  await writeFiles(resolve(out), ui, ['components', 'styles/components.css']);
  if (storybook) {
    await writeFiles(resolve(storybook), stories, ['src/stories/generated']);
  }
}

function readSchemaCatalog(path: string) {
  const library: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!library || typeof library !== 'object' || !('schemas' in library)) {
    throw new Error(`Schema library "${path}" must contain a schemas array`);
  }
  return validateDocumentFile({
    version: 1,
    id: 'codegen-schema-library',
    name: 'Codegen schema library',
    kind: 'atom',
    schemaCatalog: { schemas: library.schemas },
    root: { id: 'root', type: 'frame', tag: 'div' },
  }).schemaCatalog!;
}

async function writeFiles(
  directory: string,
  files: { path: string; contents: string }[],
  legacyRoots: readonly string[],
) {
  const formatted = await Promise.all(
    files.map(async (file) => ({
      ...file,
      contents: await formatGenerated(file.path, file.contents),
    })),
  );
  writeGeneratedFiles(directory, formatted, legacyRoots);
}
