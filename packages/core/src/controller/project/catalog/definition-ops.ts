import type {
  CatalogMapKey,
  JsonSchemaObject,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import { DocumentError } from '../../../document/errors';
import { findDefinition } from './ops';
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
  (next[kind] as Record<string, NodeDefinition>)[uuid] = {
    ...existing,
    ...definitionPatch,
    uuid,
  };
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
  for (const def of [
    ...Object.values(catalog.atoms),
    ...Object.values(catalog.components),
    ...Object.values(catalog.pages),
  ]) {
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
  const next = structuredClone(catalog) as ProjectCatalog;
  const existing = next.schemas?.[uuid];
  next.schemas = {
    ...(next.schemas ?? {}),
    [uuid]: preserveFieldIds(existing, schema) as JsonSchemaObject,
  };
  return next;
}

export function removeCatalogSchema(catalog: ProjectCatalog, uuid: string): ProjectCatalog {
  if (!catalog.schemas?.[uuid]) {
    throw new DocumentError('schema', `Unknown schema "${uuid}"`);
  }
  for (const def of [
    ...Object.values(catalog.atoms),
    ...Object.values(catalog.components),
    ...Object.values(catalog.pages),
  ]) {
    if (def.schema.kind === 'ref' && def.schema.uuid === uuid) {
      throw new DocumentError('schema', `Schema "${uuid}" is referenced by ${def.name}`);
    }
  }
  const next = structuredClone(catalog) as ProjectCatalog;
  const { [uuid]: _removed, ...rest } = next.schemas ?? {};
  next.schemas = Object.keys(rest).length ? rest : undefined;
  return next;
}

export function catalogKindForDefinition(
  catalog: ProjectCatalog,
  uuid: string,
): CatalogMapKey | null {
  return findDefinition(catalog, uuid)?.kind ?? null;
}
