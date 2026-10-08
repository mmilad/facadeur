import type { DefaultKind, NodeDefinitionModel, ProjectCatalogModel } from '@facadeur/core';
import type { AssetSummary } from '../session/types';
import { catalogDefinitionDisplayName } from './display-name';

export function catalogAssetSummaries(catalog: ProjectCatalogModel): AssetSummary[] {
  const assets: AssetSummary[] = [];
  const push = (definition: NodeDefinitionModel, kind: DefaultKind) => {
    assets.push({
      id: definition.uuid,
      name: catalogDefinitionDisplayName(catalog, definition),
      kind,
    });
  };
  for (const definition of Object.values(catalog.atoms)) push(definition, 'atom');
  for (const definition of Object.values(catalog.components)) push(definition, 'component');
  for (const definition of Object.values(catalog.pages)) push(definition, 'page');
  return assets.sort((left, right) => left.name.localeCompare(right.name));
}
