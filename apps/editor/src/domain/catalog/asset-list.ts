import type { CoreController, DefaultKind } from '@facadeur/core';
import type { AssetSummary } from '../session/types';

export function catalogAssetSummaries(core: CoreController): AssetSummary[] {
  return core.getDefinitionSummaries().map((asset) => ({
    id: asset.uuid,
    name: asset.name,
    kind: asset.kind satisfies DefaultKind,
    ...(asset.category ? { category: asset.category } : {}),
  }));
}
