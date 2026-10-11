import { findNodeByUuid, type NodeModel } from '@facadeur/core';
import type { ViewportFrame } from '../viewport/board';

/** Resolve a preview hit to the nearest node authored in the open definition. */
export function catalogNodeUuidForRenderedHit(
  frame: ViewportFrame | null,
  renderedUuid: string | null,
  root: NodeModel | undefined,
) {
  if (!frame || !renderedUuid || !root) return null;
  let element =
    [
      ...frame.host.contentDocument().querySelectorAll<HTMLElement>('[data-facadeur-node-uuid]'),
    ].find((candidate) => candidate.dataset.facadeurNodeUuid === renderedUuid) ?? null;
  while (element) {
    const uuid = element.dataset.facadeurNodeUuid;
    if (uuid && findNodeByUuid(root, uuid)) return uuid;
    element = element.parentElement;
  }
  return null;
}
