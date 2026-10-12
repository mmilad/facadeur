import type { DragEvent } from 'react';
import type { SidebarLayer } from '../../../domain/sidebar/types';

export function layerDropZoneFor(event: DragEvent, item: SidebarLayer) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
  const canInside = item.type === 'frame' || item.type === 'instance';
  if (canInside && ratio > 0.28 && ratio < 0.72) return 'inside';
  return ratio < 0.5 ? 'before' : 'after';
}
