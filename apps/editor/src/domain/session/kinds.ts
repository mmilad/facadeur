import { DocumentError, type DefaultKind, type FlatDocument } from '@facadeur/core';
import type { ControllerDocumentStore } from '@facadeur/core';

export const KINDS: readonly DefaultKind[] = ['atom', 'component', 'section', 'page'];

export function isKind(value: string): value is DefaultKind {
  return (KINDS as readonly string[]).includes(value);
}

export function kindOf(doc: FlatDocument): DefaultKind {
  if (!isKind(doc.kind)) {
    throw new DocumentError('unknown-kind', `Unsupported kind "${doc.kind}"`);
  }
  return doc.kind;
}

export function kindOfStore(store: ControllerDocumentStore | undefined): DefaultKind | null {
  if (!store) return null;
  const kind = store.getDocument().kind;
  return isKind(kind) ? kind : null;
}

export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function applyWorkspaceChange(options: {
  kind: DefaultKind;
  workspace: DefaultKind;
  openFlatKind: string;
  remembered: string | undefined;
  assetStores: ReadonlyMap<string, ControllerDocumentStore>;
  order: readonly string[];
  onSwitch: (openId: string) => void;
}): DefaultKind | null {
  if (
    options.workspace === options.kind &&
    isKind(options.openFlatKind) &&
    options.openFlatKind === options.kind
  ) {
    return null;
  }
  if (options.openFlatKind !== options.kind) {
    const remembered = options.remembered;
    const next =
      remembered &&
      options.assetStores.has(remembered) &&
      kindOfStore(options.assetStores.get(remembered)) === options.kind
        ? remembered
        : options.order.find((id) => kindOfStore(options.assetStores.get(id)) === options.kind);
    if (next) options.onSwitch(next);
  }
  return options.kind;
}

export function normalizeBreakpointId(breakpointId: string | null): string | null {
  return breakpointId && breakpointId.length > 0 ? breakpointId : null;
}

export function syncDocumentKinds(
  order: readonly string[],
  assetStores: ReadonlyMap<string, ControllerDocumentStore>,
  kinds: Map<string, string>,
): void {
  kinds.clear();
  for (const id of order) {
    const store = assetStores.get(id);
    if (!store) continue;
    const doc = store.getDocument();
    kinds.set(doc.id, doc.kind);
  }
}
