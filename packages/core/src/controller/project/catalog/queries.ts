import type { Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { tokenCustomProperty } from '../../../tokens/names';
import { listCatalogDefinitions, findDefinition } from './ops';
import { readTokenTree } from '../../style/tokens/global/tree';
import { tokenReference, tokenReferenceValue } from '../../style/tokens/syntax';
import { refsInText } from '../../style/references/text';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function definitionDisplayName(catalog: ProjectCatalog, definition: NodeDefinition) {
  const raw = definition.name?.trim() ?? '';
  if (raw && !UUID_RE.test(raw)) return raw;
  const schema =
    definition.schema.kind === 'ref'
      ? catalog.schemas?.[definition.schema.uuid]
      : definition.schema.schema;
  const title = schema?.title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  if (raw) return raw;
  return definition.kind.charAt(0).toUpperCase() + definition.kind.slice(1);
}

export function effectiveNodeTagName(catalog: ProjectCatalog, node: Node) {
  const visit = (current: Node, seen: Set<string>): string => {
    const definitionRef = current.config?.definitionRef;
    if (!definitionRef || seen.has(definitionRef)) return current.dom.tagName;
    const target = findDefinition(catalog, definitionRef)?.definition;
    if (!target) return current.dom.tagName;
    return visit(target.root, new Set(seen).add(definitionRef));
  };
  return visit(node, new Set());
}

export function definitionSummaries(catalog: ProjectCatalog) {
  const kindByMapKey = { atoms: 'atom', components: 'component', pages: 'page' } as const;
  return listCatalogDefinitions(catalog)
    .map(({ kind, definition }) => ({
      uuid: definition.uuid,
      name: definitionDisplayName(catalog, definition),
      kind: kindByMapKey[kind],
      ...(definition.category ? { category: definition.category } : {}),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function projectStyleSuggestions(catalog: ProjectCatalog) {
  const valuesByKey = new Map<string, Set<string>>();
  const tokenOptions = [...readTokenTree(catalog.tokens ?? {}).tokens.values()].map((token) => ({
    value: tokenReferenceValue(token.uuid),
    label: tokenCustomProperty(token.path),
    description: token.path,
    group: 'Design tokens',
  }));
  const visit = (node: Node) => {
    for (const [key, value] of Object.entries(node.style ?? {})) {
      if (!value.trim()) continue;
      const values = valuesByKey.get(key) ?? new Set<string>();
      values.add(value);
      valuesByKey.set(key, values);
    }
    for (const child of node.dom.children ?? []) visit(child);
  };
  for (const { definition } of listCatalogDefinitions(catalog)) visit(definition.root);

  return {
    keys: [...valuesByKey.keys()].sort((left, right) => left.localeCompare(right)),
    valuesByKey: Object.fromEntries(
      [...valuesByKey].map(([key, values]) => [
        key,
        [...values].sort((left, right) => left.localeCompare(right)),
      ]),
    ),
    options: tokenOptions,
  };
}

export function tokenByUuid(catalog: ProjectCatalog, uuid: string) {
  const token = readTokenTree(catalog.tokens ?? {}).tokens.get(uuid);
  return token ? structuredClone(token) : undefined;
}

export function tokenByReference(catalog: ProjectCatalog, value: unknown) {
  const uuid = tokenReference(value);
  return uuid ? tokenByUuid(catalog, uuid) : undefined;
}

export function tokenReferencePaths(catalog: ProjectCatalog, uuid: string) {
  const paths: string[] = [];
  const contains = (value: unknown): boolean => {
    if (typeof value === 'string') return refsInText(value).includes(uuid);
    if (Array.isArray(value)) return value.some(contains);
    if (value && typeof value === 'object') return Object.values(value).some(contains);
    return false;
  };
  for (const token of readTokenTree(catalog.tokens ?? {}).tokens.values()) {
    if (
      contains(token.value) ||
      Object.values(token.breakpoints).some((value) => contains(value))
    ) {
      paths.push(token.path);
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}
