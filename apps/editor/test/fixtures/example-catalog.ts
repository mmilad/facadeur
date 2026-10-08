import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
  type NestedNode,
  type SchemaCatalog,
} from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';

function resolveExamplesDir(): string {
  const candidates = [resolve(process.cwd(), 'examples'), resolve(process.cwd(), '../../examples')];
  try {
    candidates.push(join(dirname(fileURLToPath(import.meta.url)), '../../../../examples'));
  } catch {
    // Some Vitest environments expose a non-file import.meta.url.
  }
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  throw new Error('Could not locate examples/ directory');
}

const examplesDir = resolveExamplesDir();

let examplePoolCache: Map<string, DocumentFile> | null = null;
let allExamplesCache: DocumentFile[] | null = null;
let schemaCatalogCache: SchemaCatalog | null = null;

const fallbackSchemaCatalog: SchemaCatalog = {
  schemas: [
    {
      id: 'image',
      name: 'Image',
      schema: {
        type: 'object',
        title: 'Image',
        required: ['src'],
        properties: {
          src: { type: 'string', title: 'Source' },
          alt: { type: 'string', title: 'Alt text' },
          ratio: { type: 'string', title: 'Ratio' },
        },
        additionalProperties: false,
      },
    },
  ],
};

/** Schema library for tests (legacy examples/schemas.json removed during catalog reset). */
export function exampleSchemaCatalog(): SchemaCatalog {
  if (!schemaCatalogCache) {
    const schemasPath = join(examplesDir, 'schemas.json');
    if (existsSync(schemasPath)) {
      const source = JSON.parse(readFileSync(schemasPath, 'utf8')) as {
        schemas?: SchemaCatalog['schemas'];
      };
      schemaCatalogCache = { schemas: source.schemas ?? [] };
    } else {
      schemaCatalogCache = fallbackSchemaCatalog;
    }
  }
  return schemaCatalogCache;
}

/** Project design context paired with the standard example component catalog. */
export function editorStandardDesign() {
  return {
    ...createProjectTemplateDocument(),
    schemaCatalog: exampleSchemaCatalog(),
  };
}

/** Raw example documents from `examples/` (not yet validated as a catalog). */
export function loadExampleFiles(): DocumentFile[] {
  return readdirSync(examplesDir)
    .filter((name) => name.endsWith('.json') && name !== 'schemas.json')
    .sort()
    .map((name) => JSON.parse(readFileSync(join(examplesDir, name), 'utf8')) as DocumentFile)
    .filter((file) => file.version === 1 && file.id && file.root);
}

function examplePool(): Map<string, DocumentFile> {
  if (!examplePoolCache) {
    examplePoolCache = new Map(loadExampleFiles().map((file) => [file.id, file]));
  }
  return examplePoolCache;
}

function instanceIdsInTree(root: NestedNode): string[] {
  const ids: string[] = [];
  const visit = (node: NestedNode) => {
    if (node.type === 'instance') ids.push(node.component);
    if (node.type === 'frame') {
      for (const child of node.children ?? []) visit(child);
    }
  };
  visit(root);
  return ids;
}

function resolveSeed(seed: unknown, pool: Map<string, DocumentFile>): DocumentFile {
  if (typeof seed === 'string') {
    const doc = pool.get(seed);
    if (!doc) throw new Error(`Example document "${seed}" is not in examples/`);
    return doc;
  }
  return validateDocumentFile(seed);
}

/**
 * Build a valid catalog from seed documents or example ids, pulling in every
 * referenced instance from the example pool (transitive closure).
 */
export function expandExampleCatalog(seeds: readonly unknown[]): DocumentFile[] {
  const pool = examplePool();
  const byId = new Map<string, DocumentFile>();
  const queue: string[] = [];

  for (const seed of seeds) {
    const doc = resolveSeed(seed, pool);
    byId.set(doc.id, doc);
    queue.push(doc.id);
  }

  while (queue.length > 0) {
    const id = queue.pop()!;
    const doc = byId.get(id);
    if (!doc) continue;
    for (const ref of instanceIdsInTree(doc.root)) {
      if (byId.has(ref)) continue;
      const dependency = pool.get(ref);
      if (!dependency) {
        throw new Error(
          `Document "${id}" references unknown component "${ref}"; add it to examples/ or the seed list`,
        );
      }
      byId.set(ref, dependency);
      queue.push(ref);
    }
  }

  return validateCatalog(
    [...byId.values()].sort((left, right) => left.id.localeCompare(right.id)),
    { schemaCatalog: exampleSchemaCatalog() },
  );
}

/** Specimen + form stack used by most editor UI integration tests. */
export function editorStandardCatalog(): DocumentFile[] {
  return expandExampleCatalog([
    'button',
    'link',
    'input',
    'textarea',
    'card',
    'sign-in',
    'specimen-section',
    'specimen',
  ]);
}

/** Every committed example, validated together (hydration, forward references). */
export function allExampleDocuments(): DocumentFile[] {
  if (!allExamplesCache) {
    allExamplesCache = validateCatalog(loadExampleFiles(), {
      schemaCatalog: exampleSchemaCatalog(),
    });
  }
  return allExamplesCache;
}
