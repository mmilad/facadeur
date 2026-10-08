import { createCatalogUuid, type DefaultKind, type NodeDefinitionModel } from '@facadeur/core';
import type { AssetSummary } from '../session/types';

const NOUN: Record<'atom' | 'component' | 'page', string> = {
  atom: 'atom',
  component: 'component',
  page: 'page',
};

export function assetKindToCatalogMap(
  kind: DefaultKind,
): 'atoms' | 'components' | 'pages' | null {
  if (kind === 'atom') return 'atoms';
  if (kind === 'component') return 'components';
  if (kind === 'page') return 'pages';
  return null;
}

/** New catalog definition with a unique display name among existing assets. */
export function blankCatalogDefinition(
  kind: 'atom' | 'component' | 'page',
  taken: readonly AssetSummary[],
): NodeDefinitionModel {
  const baseName = `New ${NOUN[kind]}`;
  const names = new Set(taken.map((asset) => asset.name));
  let name = baseName;
  let count = 2;
  while (names.has(name)) {
    name = `${baseName} ${count}`;
    count += 1;
  }
  const uuid = createCatalogUuid();
  const rootUuid = createCatalogUuid();
  return {
    uuid,
    name,
    kind,
    schema: {
      kind: 'inline',
      schema: {
        type: 'object',
        title: name,
        properties: {},
        additionalProperties: false,
      },
    },
    root: {
      uuid: rootUuid,
      dom: { tagName: 'div', children: [] },
    },
  };
}
