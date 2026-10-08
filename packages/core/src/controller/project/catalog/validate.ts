import { Value } from '@sinclair/typebox/value';
import { DocumentError } from '../../../document/errors';
import {
  projectCatalogSchema,
  type ProjectCatalogModel,
} from '../../../schema/node-model/index';
import { sanitizeProjectCatalog } from './sanitize-field-values';

function catalogSchemaErrorMessage(data: unknown): string {
  try {
    return (
      [...Value.Errors(projectCatalogSchema, data)]
        .map((error) => `${error.path} ${error.message}`.trim())
        .join('; ') || 'Catalog does not match the schema'
    );
  } catch {
    return 'Catalog does not match the schema';
  }
}

export function validateProjectCatalog(data: unknown): ProjectCatalogModel {
  const catalog =
    data && typeof data === 'object'
      ? sanitizeProjectCatalog(data as ProjectCatalogModel)
      : data;

  try {
    if (!Value.Check(projectCatalogSchema, catalog)) {
      throw new DocumentError('schema', catalogSchemaErrorMessage(catalog));
    }
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError('schema', catalogSchemaErrorMessage(catalog));
  }

  assertCatalogRefIntegrity(catalog as ProjectCatalogModel);
  return catalog as ProjectCatalogModel;
}

/** Ensure schema refs and definitionRef targets exist in the catalog. */
export function assertCatalogRefIntegrity(catalog: ProjectCatalogModel): void {
  const schemaIds = new Set(Object.keys(catalog.schemas ?? {}));
  const definitionIds = new Set<string>([
    ...Object.keys(catalog.atoms),
    ...Object.keys(catalog.components),
    ...Object.keys(catalog.pages),
  ]);

  const visitNode = (node: {
    config?: { definitionRef?: string };
    dom: { children?: readonly unknown[] };
  }) => {
    const ref = node.config?.definitionRef;
    if (ref && !definitionIds.has(ref)) {
      throw new DocumentError('schema', `Unknown definitionRef "${ref}"`);
    }
    for (const child of node.dom.children ?? []) {
      visitNode(child as typeof node);
    }
  };

  const checkSchemaSource = (source: { kind: string; uuid?: string }, context: string) => {
    if (source.kind === 'ref') {
      const id = source.uuid;
      if (!id || !schemaIds.has(id)) {
        throw new DocumentError('schema', `Missing schema ref ${id ?? '?'} (${context})`);
      }
    }
  };

  for (const [id, def] of Object.entries(catalog.atoms)) {
    checkSchemaSource(def.schema, `atom ${id}`);
    visitNode(def.root);
  }
  for (const [id, def] of Object.entries(catalog.components)) {
    checkSchemaSource(def.schema, `component ${id}`);
    visitNode(def.root);
  }
  for (const [id, def] of Object.entries(catalog.pages)) {
    checkSchemaSource(def.schema, `page ${id}`);
    visitNode(def.root);
  }
}

export function emptyProjectCatalog(): ProjectCatalogModel {
  return { atoms: {}, components: {}, pages: {} };
}
