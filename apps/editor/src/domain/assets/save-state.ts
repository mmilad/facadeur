import type { FlatDocument } from '@facadeur/core';
import { documentToJson } from './files.js';

/** Last successfully persisted JSON per document id (design uses its document id). */
export type SavedJsonBaselines = Map<string, string>;

export function fingerprintDocument(doc: FlatDocument): string {
  return documentToJson(doc);
}

export function isDocumentDirty(
  baselines: SavedJsonBaselines,
  id: string,
  doc: FlatDocument,
): boolean {
  const saved = baselines.get(id);
  if (saved === undefined) return true;
  return fingerprintDocument(doc) !== saved;
}

export function markDocumentSaved(
  baselines: SavedJsonBaselines,
  id: string,
  doc: FlatDocument,
): void {
  baselines.set(id, fingerprintDocument(doc));
}

export function clearDocumentSaved(baselines: SavedJsonBaselines, id: string): void {
  baselines.delete(id);
}
