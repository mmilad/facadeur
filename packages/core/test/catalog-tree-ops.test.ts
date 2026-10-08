import { describe, expect, it } from 'vitest';
import { createCatalogUuid } from '../src/document/ids';
import {
  findParentOfNode,
  insertCatalogNode,
  moveCatalogNode,
  removeCatalogNode,
} from '../src/controller/project/catalog/tree-ops';
import type { NodeDefinition, ProjectCatalog } from '@facadeur/domain';

function componentCatalog(root: NodeDefinition['root']): ProjectCatalog {
  const defUuid = createCatalogUuid();
  return {
    atoms: {},
    components: {
      [defUuid]: {
        uuid: defUuid,
        name: 'Card',
        kind: 'component',
        schema: { kind: 'inline', schema: { type: 'object', properties: {} } },
        root,
      },
    },
    pages: {},
  };
}

describe('catalog tree ops', () => {
  it('inserts and removes a child under the open definition root', () => {
    const rootUuid = createCatalogUuid();
    const childUuid = createCatalogUuid();
    const catalog = componentCatalog({
      uuid: rootUuid,
      dom: { tagName: 'div', children: [] },
    });
    const defUuid = Object.keys(catalog.components)[0]!;
    const child = { uuid: childUuid, dom: { tagName: 'span' } };

    const inserted = insertCatalogNode(catalog, defUuid, rootUuid, 0, child);
    const def = inserted.components[defUuid]!;
    expect(def.root.dom.children).toHaveLength(1);
    expect(def.root.dom.children?.[0]?.uuid).toBe(childUuid);

    const removed = removeCatalogNode(inserted, defUuid, childUuid);
    expect(removed.components[defUuid]!.root.dom.children).toHaveLength(0);
    expect(findParentOfNode(removed.components[defUuid]!.root, childUuid)).toBeNull();
  });

  it('moves a node between siblings', () => {
    const rootUuid = createCatalogUuid();
    const firstUuid = createCatalogUuid();
    const secondUuid = createCatalogUuid();
    const catalog = componentCatalog({
      uuid: rootUuid,
      dom: {
        tagName: 'div',
        children: [
          { uuid: firstUuid, dom: { tagName: 'span' } },
          { uuid: secondUuid, dom: { tagName: 'span' } },
        ],
      },
    });
    const defUuid = Object.keys(catalog.components)[0]!;
    const moved = moveCatalogNode(catalog, defUuid, secondUuid, rootUuid, 0);
    const children = moved.components[defUuid]!.root.dom.children ?? [];
    expect(children.map((child) => child.uuid)).toEqual([secondUuid, firstUuid]);
  });
});
