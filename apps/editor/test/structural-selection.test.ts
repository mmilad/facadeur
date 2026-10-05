import { describe, expect, it } from 'vitest';
import {
  publicFieldsFor,
  toFlat,
  toNested,
  withPreviewData,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';
import { nodeIdForHit } from '../src/domain/selection/selection-model';
import { resolveNestedSelection } from '../src/domain/nested-selection';

const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  fields: [{ name: 'title', type: 'text', required: true }],
  root: {
    id: 'root',
    type: 'frame',
    children: [{ id: 'label', type: 'text', bindings: [{ field: 'title', target: 'text' }] }],
  },
};
const list: DocumentFile = {
  version: 1,
  id: 'list',
  name: 'List',
  kind: 'component',
  previewData: { fields: { items: [{ title: 'First' }, { title: 'Second' }] } },
  root: {
    id: 'repeat',
    type: 'repeater',
    children: [
      {
        id: 'switch',
        type: 'switch',
        children: [{ id: 'card', type: 'instance', component: 'card' }],
      },
    ],
  },
};
const page: DocumentFile = {
  version: 1,
  id: 'page',
  name: 'Page',
  kind: 'page',
  root: {
    id: 'root',
    type: 'frame',
    children: [
      {
        id: 'placed-list',
        type: 'instance',
        component: 'list',
        fields: { items: [{ title: 'First' }, { title: 'Second' }] },
      },
    ],
  },
};

describe('structural rendered selection', () => {
  it('selects the local interface instance through a repeated item index', () => {
    const document = toFlat(list);
    expect(nodeIdForHit(document, 'repeat/1/switch/card/label', true)).toBe('card');
  });

  it('resolves the correct item data through a placed structural-root component', () => {
    const documents = [card, list, page].map(toFlat);
    const catalog = new Map(documents.map((document) => [document.id, document]));
    const prepare = (document: FlatDocument) =>
      toFlat(withPreviewData(toNested(document), null, publicFieldsFor(document, catalog)));
    const selection = resolveNestedSelection(
      toFlat(page),
      'placed-list/repeat/1/switch/card/label',
      catalog,
      false,
      prepare,
    );
    expect(selection?.node.id).toBe('label');
    expect(selection?.ownerNodeId).toBe('placed-list');
    expect(selection?.resolvedFields?.title).toBe('Second');
  });

  it('resolves typed case payloads through virtual switch branches', () => {
    const typedList: DocumentFile = {
      ...list,
      previewData: { fields: { items: [{ type: 'card', props: { title: 'Typed second' } }] } },
    };
    const typedPage: DocumentFile = {
      ...page,
      root: {
        ...page.root,
        type: 'frame',
        children: [
          {
            id: 'placed-list',
            type: 'instance',
            component: 'list',
            fields: { items: [{ type: 'card', props: { title: 'Typed second' } }] },
          },
        ],
      },
    };
    const documents = [card, typedList, typedPage].map(toFlat);
    const catalog = new Map(documents.map((document) => [document.id, document]));
    const prepare = (document: FlatDocument) =>
      toFlat(withPreviewData(toNested(document), null, publicFieldsFor(document, catalog)));
    const selection = resolveNestedSelection(
      toFlat(typedPage),
      'placed-list/repeat/0/switch/card/label',
      catalog,
      false,
      prepare,
    );
    expect(selection?.node.id).toBe('label');
    expect(selection?.resolvedFields?.title).toBe('Typed second');
  });
});
