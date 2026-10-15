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

  it('prunes bound styles for a removed subtree while preserving unrelated styles', () => {
    const rootUuid = createCatalogUuid();
    const removedUuid = createCatalogUuid();
    const descendantUuid = createCatalogUuid();
    const keptUuid = createCatalogUuid();
    const catalog = componentCatalog({
      uuid: rootUuid,
      dom: {
        tagName: 'div',
        children: [
          {
            uuid: removedUuid,
            dom: {
              tagName: 'section',
              children: [{ uuid: descendantUuid, dom: { tagName: 'span' } }],
            },
          },
          { uuid: keptUuid, dom: { tagName: 'span' } },
        ],
      },
    });
    const defUuid = Object.keys(catalog.components)[0]!;
    const withStyles: ProjectCatalog = {
      ...catalog,
      globalStyles: {
        block: {
          rules: [
            {
              id: `layer-${removedUuid}`,
              selector: '.removed',
              bindings: { removed: removedUuid },
              declarations: { display: 'none' },
            },
            {
              id: `layer-${keptUuid}`,
              selector: '.kept',
              bindings: { kept: keptUuid },
              declarations: { display: 'block' },
            },
          ],
        },
      },
    };

    const removed = removeCatalogNode(withStyles, defUuid, removedUuid);
    const block = removed.globalStyles?.block;

    expect(block?.rules?.map(({ id }) => id)).toEqual([`layer-${keptUuid}`]);
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
