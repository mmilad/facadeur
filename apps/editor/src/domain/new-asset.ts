import type { DefaultKind, DocumentFile } from '@facadeur/core';

const NOUN: Record<DefaultKind, string> = {
  atom: 'atom',
  component: 'component',
  section: 'section',
  page: 'page',
};

export interface AssetIdentity {
  id: string;
  name: string;
}

/** Empty frame document for "New". Ids and names stay unique in the catalog. */
export function blankAsset(kind: DefaultKind, taken: readonly AssetIdentity[]): DocumentFile {
  const baseName = `New ${NOUN[kind]}`;
  const names = new Set(taken.map((asset) => asset.name));
  let name = baseName;
  let count = 2;
  while (names.has(name)) {
    name = `${baseName} ${count}`;
    count += 1;
  }
  const ids = new Set(taken.map((asset) => asset.id));
  const baseId = slug(name);
  let id = baseId;
  let suffix = 2;
  while (ids.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return {
    version: 1,
    id,
    name,
    kind,
    root: { id: 'root', type: 'frame', name: 'Frame' },
  };
}

function slug(name: string): string {
  const raw = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!raw) return 'asset';
  return /^[a-z]/.test(raw) ? raw : `asset-${raw}`;
}
