import { randomUUID } from 'node:crypto';
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import {
  DocumentError,
  validateProjectCatalog,
  type NodeDefinitionModel,
  type ProjectCatalogModel,
} from '@facadeur/core';
import { DomainError } from '../../errors';
import type { ProjectStorage } from '../../contracts/management';
import { atomicWrite, storageDirectory } from './files';
import { seedProjectCatalog } from './catalog-seed';

export const CATALOG_SOURCE = 'catalog.json';

const CATALOG_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCatalogUuid(value: string | undefined): value is string {
  return typeof value === 'string' && CATALOG_UUID.test(value);
}

export async function readProjectCatalog(storage?: ProjectStorage): Promise<ProjectCatalogModel> {
  const filename = path.join(storageDirectory(storage), CATALOG_SOURCE);
  try {
    const text = await readFile(filename, 'utf8');
    return validateProjectCatalog(JSON.parse(text));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return seedProjectCatalog();
    }
    if (error instanceof DocumentError) {
      throw new DomainError('invalid-input', error.message);
    }
    throw error;
  }
}

export async function writeProjectCatalog(
  catalog: unknown,
  storage?: ProjectStorage,
): Promise<ProjectCatalogModel> {
  let validated: ProjectCatalogModel;
  try {
    validated = validateProjectCatalog(catalog);
  } catch (error) {
    if (error instanceof DocumentError) throw new DomainError('invalid-input', error.message);
    throw error;
  }
  const filename = path.join(storageDirectory(storage), CATALOG_SOURCE);
  await atomicWrite(filename, JSON.stringify(validated, null, 2) + '\n');
  return validated;
}

export async function ensureProjectCatalogFile(storage: ProjectStorage): Promise<void> {
  const filename = path.join(storageDirectory(storage), CATALOG_SOURCE);
  try {
    const stat = await lstat(filename);
    if (stat.isFile()) return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await writeProjectCatalog(seedProjectCatalog(), storage);
}

export type CatalogDefinitionKind = 'atoms' | 'components' | 'pages';

export async function createCatalogDefinition(
  kind: CatalogDefinitionKind,
  definition: Omit<NodeDefinitionModel, 'uuid'> & { uuid?: string },
  storage?: ProjectStorage,
): Promise<ProjectCatalogModel> {
  const catalog = await readProjectCatalog(storage);
  let uuid = definition.uuid ?? randomUUID();
  if (!isCatalogUuid(uuid)) uuid = randomUUID();
  const rootUuid = isCatalogUuid(definition.root?.uuid)
    ? definition.root.uuid
    : randomUUID();
  const nextDef: NodeDefinitionModel = {
    ...definition,
    uuid,
    root: { ...definition.root, uuid: rootUuid },
  };
  if (catalog[kind][uuid]) {
    throw new DomainError('conflict', `Definition "${uuid}" already exists in ${kind}`);
  }
  const next = structuredClone(catalog) as ProjectCatalogModel;
  next[kind] = { ...next[kind], [uuid]: nextDef };
  return writeProjectCatalog(next, storage);
}

export async function patchCatalogDefinition(
  kind: CatalogDefinitionKind,
  uuid: string,
  patch: Partial<NodeDefinitionModel>,
  storage?: ProjectStorage,
): Promise<ProjectCatalogModel> {
  const catalog = await readProjectCatalog(storage);
  const existing = catalog[kind][uuid];
  if (!existing) throw new DomainError('invalid-input', `Unknown ${kind} definition "${uuid}"`);
  const next = structuredClone(catalog) as ProjectCatalogModel;
  next[kind] = {
    ...next[kind],
    [uuid]: { ...existing, ...patch, uuid },
  };
  return writeProjectCatalog(next, storage);
}

export async function deleteCatalogDefinition(
  kind: CatalogDefinitionKind,
  uuid: string,
  storage?: ProjectStorage,
): Promise<ProjectCatalogModel> {
  const catalog = await readProjectCatalog(storage);
  if (!catalog[kind][uuid]) {
    throw new DomainError('invalid-input', `Unknown ${kind} definition "${uuid}"`);
  }
  for (const def of [...Object.values(catalog.atoms), ...Object.values(catalog.components), ...Object.values(catalog.pages)]) {
    const visit = (node: NodeDefinitionModel['root']): boolean => {
      if (node.config?.definitionRef === uuid) return true;
      for (const child of node.dom.children ?? []) {
        if (visit(child)) return true;
      }
      return false;
    };
    if (visit(def.root)) {
      throw new DomainError('conflict', `Definition "${uuid}" is still referenced by ${def.uuid}`);
    }
  }
  const next = structuredClone(catalog) as ProjectCatalogModel;
  const { [uuid]: _removed, ...rest } = next[kind];
  next[kind] = rest;
  return writeProjectCatalog(next, storage);
}
