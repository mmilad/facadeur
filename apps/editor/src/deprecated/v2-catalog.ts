/**
 * Reference copy of removed editor catalog helpers.
 * @deprecated Use `@facadeur/core` (`findDefinition`, `findNodeByUuid`, `patchNodeData`, …).
 */
import type { DefaultKind, NodeDefinitionModel, NodeModel, ProjectCatalogModel } from '@facadeur/core';
import type { AssetSummary } from '../domain/session/types';

export type V2DefinitionKind = 'atoms' | 'components' | 'pages';

export function findV2Definition(
  catalog: ProjectCatalogModel,
  id: string,
): { kind: V2DefinitionKind; definition: NodeDefinitionModel } | null {
  if (catalog.atoms[id]) return { kind: 'atoms', definition: catalog.atoms[id]! };
  if (catalog.components[id]) return { kind: 'components', definition: catalog.components[id]! };
  if (catalog.pages[id]) return { kind: 'pages', definition: catalog.pages[id]! };
  return null;
}

export function v2AssetsFromCatalog(catalog: ProjectCatalogModel): AssetSummary[] {
  const assets: AssetSummary[] = [];
  const push = (definition: NodeDefinitionModel, kind: DefaultKind) => {
    assets.push({ id: definition.uuid, name: definition.name, kind });
  };
  for (const definition of Object.values(catalog.atoms)) push(definition, 'atom');
  for (const definition of Object.values(catalog.components)) push(definition, 'component');
  for (const definition of Object.values(catalog.pages)) push(definition, 'page');
  return assets.sort((left, right) => left.name.localeCompare(right.name));
}

export function findV2NodeByUuid(root: NodeModel, uuid: string): NodeModel | null {
  if (root.uuid === uuid) return root;
  for (const child of root.dom.children ?? []) {
    const found = findV2NodeByUuid(child, uuid);
    if (found) return found;
  }
  return null;
}
