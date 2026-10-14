import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { findDefinition, listCatalogDefinitions } from '@facadeur/core';
import { CodegenError } from './error';

export interface CatalogEntry {
  readonly definition: NodeDefinition;
  readonly exportName: string;
  readonly directory: string;
}

export function catalogEntries(catalog: ProjectCatalog, requested?: readonly string[]) {
  const all = listCatalogDefinitions(catalog).map(({ definition }) => definition);
  const names = uniqueExportNames(all);
  const directories = new Map<string, string>();
  const usedDirectories = new Set<string>();
  for (const definition of all) {
    const base = slug(definition.name, definition.uuid);
    let directory = base;
    let suffix = 2;
    while (usedDirectories.has(directory)) directory = `${base}-${suffix++}`;
    usedDirectories.add(directory);
    directories.set(definition.uuid, directory);
  }
  const selected = selectDefinitions(catalog, all, requested);
  return selected.map(
    (definition) =>
      ({
        definition,
        exportName: names.get(definition.uuid)!,
        directory: directories.get(definition.uuid)!,
      }) satisfies CatalogEntry,
  );
}

function selectDefinitions(
  catalog: ProjectCatalog,
  definitions: readonly NodeDefinition[],
  requested?: readonly string[],
) {
  if (!requested?.length) return [...definitions];
  const selected = new Set<string>();
  const visitDefinition = (uuid: string) => {
    if (selected.has(uuid)) return;
    const target = findDefinition(catalog, uuid)?.definition;
    if (!target) throw new CodegenError(`Unknown codegen entry or dependency "${uuid}"`);
    selected.add(uuid);
    visitNode(target.root, visitDefinition);
  };
  requested.forEach(visitDefinition);
  return definitions.filter((definition) => selected.has(definition.uuid));
}

function visitNode(node: Node, visit: (uuid: string) => void) {
  if (node.config?.definitionRef) visit(node.config.definitionRef);
  for (const child of node.dom.children ?? []) visitNode(child, visit);
}

function uniqueExportNames(definitions: readonly NodeDefinition[]) {
  const grouped = new Map<string, NodeDefinition[]>();
  for (const definition of definitions) {
    const name = pascalCase(definition.name) || 'Component';
    grouped.set(name, [...(grouped.get(name) ?? []), definition]);
  }
  const names = new Map<string, string>();
  for (const [name, matches] of grouped) {
    matches.forEach((definition, index) => {
      names.set(definition.uuid, matches.length === 1 ? name : `${name}${index + 1}`);
    });
  }
  return names;
}

export function pascalCase(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join('');
}

function slug(value: string, uuid: string) {
  const base = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `definition-${uuid.slice(0, 8)}`;
}
