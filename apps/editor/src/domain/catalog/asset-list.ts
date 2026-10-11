import { listCatalogDefinitions, type DefaultKind, type ProjectCatalogModel } from '@facadeur/core';
import type { AssetSummary } from '../session/types';
import { catalogDefinitionDisplayName } from './display-name';

export function catalogAssetSummaries(catalog: ProjectCatalogModel): AssetSummary[] {
  const assets: AssetSummary[] = [];
  const kindByMapKey = { atoms: 'atom', components: 'component', pages: 'page' } as const;
  for (const { kind, definition } of listCatalogDefinitions(catalog)) {
    assets.push({
      id: definition.uuid,
      name: catalogDefinitionDisplayName(catalog, definition),
      kind: kindByMapKey[kind] satisfies DefaultKind,
    });
  }
  return assets.sort((left, right) => left.name.localeCompare(right.name));
}
