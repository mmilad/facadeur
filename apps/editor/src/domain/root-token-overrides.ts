import {
  componentTokenPublicPath,
  listComponentTokens,
  resolveVariantDocument,
  tokenReference,
  variantPresets,
  type Command,
  type DocumentFile,
  type FlatDocument,
  type NestedNode,
  type TokenType,
} from '@facadeur/core';

export interface RootTokenTarget {
  path: string;
  label: string;
  type?: TokenType;
  fallback: string;
}

/** Public tokens reachable below this root; repeated instances share one target. */
export function rootTokenTargets(
  ownerId: string,
  documents: readonly DocumentFile[],
): RootTokenTarget[] {
  const catalog = new Map(documents.map((document) => [document.id, document]));
  const visited = new Set<string>([ownerId]);
  const targets: RootTokenTarget[] = [];
  function visitNode(node: NestedNode): void {
    if (node.type === 'frame') node.children?.forEach(visitNode);
    if (node.type !== 'instance' || visited.has(node.component)) return;
    visited.add(node.component);
    const component = catalog.get(node.component);
    if (!component) return;
    for (const token of listComponentTokens(component.componentTokens)) {
      targets.push({
        path: componentTokenPublicPath(component.id, token.path),
        label: `${component.name} · ${token.label || token.path}`,
        type: token.type,
        fallback: token.value,
      });
    }
    visitDocument(component);
  }
  function visitDocument(document: DocumentFile): void {
    visitNode(document.root);
    for (const preset of variantPresets(document)) {
      visitNode(resolveVariantDocument(document, preset.name).root);
    }
  }
  const owner = catalog.get(ownerId);
  if (owner) visitDocument(owner);
  return targets.sort((left, right) => left.path.localeCompare(right.path));
}

/** Keep unrelated sets/reads; clearing an override restores the child's fallback. */
export function rootTokenOverrideCommand(
  document: Pick<FlatDocument, 'tokenInterface'>,
  path: string,
  value: string | null,
): Command {
  const sets = { ...document.tokenInterface?.sets };
  if (value === null || !value.trim()) delete sets[path];
  else sets[path] = value.trim();
  const reads = new Set(document.tokenInterface?.reads ?? []);
  const tokenUuid = tokenReference(value);
  if (tokenUuid) reads.add(tokenUuid);
  const tokenInterface = {
    ...(reads.size ? { reads: [...reads].sort() } : {}),
    ...(Object.keys(sets).length ? { sets } : {}),
  };
  return {
    type: 'setTokenInterface',
    tokenInterface: Object.keys(tokenInterface).length ? tokenInterface : null,
  };
}
