import type {
  CatalogMapKey,
  JsonSchemaObject,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import { DocumentError } from '../../../document/errors';
import { findDefinition, listCatalogDefinitions } from './ops';
import { preserveFieldIds } from './field-ids';

export function createCatalogDefinition(
  catalog: ProjectCatalog,
  kind: CatalogMapKey,
  definition: NodeDefinition,
): ProjectCatalog {
  const next = structuredClone(catalog) as ProjectCatalog;
  if (next[kind][definition.uuid]) {
    throw new DocumentError('schema', `Definition "${definition.uuid}" already exists in ${kind}`);
  }
  (next[kind] as Record<string, NodeDefinition>)[definition.uuid] = definition;
  return next;
}

export function patchCatalogDefinitionRecord(
  catalog: ProjectCatalog,
  kind: CatalogMapKey,
  uuid: string,
  patch: Partial<NodeDefinition>,
): ProjectCatalog {
  const existing = catalog[kind][uuid];
  if (!existing) {
    throw new DocumentError('schema', `Unknown ${kind} definition "${uuid}"`);
  }
  const next = structuredClone(catalog) as ProjectCatalog;
  const definitionPatch =
    patch.schema?.kind === 'inline' && existing.schema.kind === 'inline'
      ? {
          ...patch,
          schema: {
            ...patch.schema,
            schema: preserveFieldIds(
              existing.schema.schema,
              patch.schema.schema,
            ) as JsonSchemaObject,
          },
        }
      : patch;
  const nextDefinition = {
    ...existing,
    ...definitionPatch,
    uuid,
  };
  if (Object.prototype.hasOwnProperty.call(patch, 'category') && patch.category === undefined) {
    delete (nextDefinition as { category?: string }).category;
  }
  (next[kind] as Record<string, NodeDefinition>)[uuid] = nextDefinition;
  return next;
}

export function deleteCatalogDefinitionRecord(
  catalog: ProjectCatalog,
  kind: CatalogMapKey,
  uuid: string,
): ProjectCatalog {
  if (!catalog[kind][uuid]) {
    throw new DocumentError('schema', `Unknown ${kind} definition "${uuid}"`);
  }
  for (const { definition: def } of listCatalogDefinitions(catalog)) {
    const visit = (node: NodeDefinition['root']): boolean => {
      if (node.config?.definitionRef === uuid) return true;
      for (const child of node.dom.children ?? []) {
        if (visit(child)) return true;
      }
      return false;
    };
    if (visit(def.root)) {
      throw new DocumentError('schema', `Definition "${uuid}" is still referenced by ${def.uuid}`);
    }
  }
  const next = structuredClone(catalog) as ProjectCatalog;
  const { [uuid]: _removed, ...rest } = next[kind] as Record<string, NodeDefinition>;
  (next[kind] as Record<string, NodeDefinition>) = rest;
  return next;
}

export function upsertCatalogSchema(
  catalog: ProjectCatalog,
  uuid: string,
  schema: JsonSchemaObject,
): ProjectCatalog {
  const existing = catalog.schemas?.[uuid];
  return {
    ...catalog,
    schemas: {
      ...(catalog.schemas ?? {}),
      [uuid]: preserveFieldIds(existing, schema) as JsonSchemaObject,
    },
  };
}

export function removeCatalogSchema(catalog: ProjectCatalog, uuid: string): ProjectCatalog {
  if (!catalog.schemas?.[uuid]) {
    throw new DocumentError('schema', `Unknown schema "${uuid}"`);
  }
  for (const { definition: def } of listCatalogDefinitions(catalog)) {
    if (def.schema.kind === 'ref' && def.schema.uuid === uuid) {
      throw new DocumentError('schema', `Schema "${uuid}" is referenced by ${def.name}`);
    }
  }
  const { [uuid]: _removed, ...schemas } = catalog.schemas ?? {};
  return {
    ...catalog,
    schemas: Object.keys(schemas).length ? schemas : undefined,
  };
}

export function catalogKindForDefinition(
  catalog: ProjectCatalog,
  uuid: string,
): CatalogMapKey | null {
  return findDefinition(catalog, uuid)?.kind ?? null;
}
