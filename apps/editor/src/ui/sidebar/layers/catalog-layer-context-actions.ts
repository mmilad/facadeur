import { findNodeByUuid, findParentOfNode } from '@facadeur/core';
import type { AppService } from '../../../app-service';
import { catalogNodeFromInsertEntry } from '../../../domain/catalog/layer-node-draft';
import {
  catalogLayerInsertTarget,
  catalogPlacementAllowed,
} from '../../../domain/catalog/catalog-layer-insert';
import { refusalMessage } from '../../../domain/editing';
import type { LayerInsertEntry } from '../../../domain/layer-insert-policy';
import type { LayerItem } from '../../../domain/selection/selection-model';
import type { EditorSnapshot } from '../../../domain/session';
import {
  canDeleteCatalogLayer,
  canInsertBelowCatalogLayer,
  canInsertInsideCatalogLayer,
} from './catalog-layer-context-policy';

export {
  canDeleteCatalogLayer,
  canInsertBelowCatalogLayer,
  canInsertInsideCatalogLayer,
  canEditCatalogLayerItem,
} from './catalog-layer-context-policy';

export async function insertCatalogLayerEntry(
  app: AppService,
  snap: EditorSnapshot,
  item: LayerItem,
  entry: LayerInsertEntry,
  placement: 'inside' | 'below',
): Promise<void> {
  if (placement === 'inside' && !canInsertInsideCatalogLayer(item, snap)) return;
  if (placement === 'below' && !canInsertBelowCatalogLayer(item, snap)) return;

  const definition = snap.openDefinition;
  if (!definition) return;
  const spot = catalogLayerInsertTarget(definition, item, placement);
  if (!spot) return;
  const parentForRule = findNodeByUuid(definition.root, spot.parentUuid);
  if (!parentForRule) return;

  if (!catalogPlacementAllowed(definition.kind, parentForRule, entry, snap.catalog)) {
    const assetKind =
      entry.kind === 'instance'
        ? snap.catalog.find((asset) => asset.id === entry.assetId)?.kind
        : undefined;
    app.session.setNotice(
      refusalMessage(
        definition.kind,
        entry.kind === 'instance' ? 'instance' : entry.kind === 'primitive' ? entry.tool : 'node',
        assetKind,
      ),
      'error',
    );
    return;
  }

  const node = catalogNodeFromInsertEntry(entry);
  if (!node) return;

  app.core.insertCatalogNode(spot.parentUuid, spot.index, node);
  await app.persistCatalog();
  app.session.selectNode(node.uuid);
}

export async function deleteCatalogLayer(
  app: AppService,
  snap: EditorSnapshot,
  item: LayerItem,
): Promise<void> {
  if (!canDeleteCatalogLayer(item, snap)) return;
  const definition = snap.openDefinition;
  if (!definition) return;
  const parentInfo = findParentOfNode(definition.root, item.id);
  const selectAfter = parentInfo?.parent.uuid ?? definition.root.uuid;

  app.core.removeCatalogNode(item.id);
  await app.persistCatalog();
  app.session.selectNode(selectAfter);
}
