import { expect, it } from 'vitest';
import { publicFieldsFor, toFlat, type DocumentFile } from '@facadeur/core';
import { structuralItemChoices } from '../src/domain/schema/structural-item-choices.js';

it('offers all configured transitive component/section alternatives through a placed list', () => {
  const card: DocumentFile = {
    version: 1,
    id: 'card',
    name: 'Card',
    kind: 'component',
    fields: [{ name: 'title', type: 'text', required: true }],
    root: { id: 'root', type: 'text' },
  };
  const card2: DocumentFile = {
    version: 1,
    id: 'card2',
    name: 'Card 2',
    kind: 'section',
    fields: [{ name: 'count', type: 'number', required: true }],
    root: { id: 'root', type: 'text' },
  };
  const list: DocumentFile = {
    version: 1,
    id: 'list',
    name: 'List',
    kind: 'component',
    root: {
      id: 'repeat',
      type: 'repeater',
      children: [
        {
          id: 'switch',
          type: 'switch',
          children: [
            { id: 'one', type: 'instance', component: card.id },
            { id: 'two', type: 'instance', component: card2.id },
          ],
        },
      ],
    },
  };
  const wrapper: DocumentFile = {
    version: 1,
    id: 'wrapper',
    name: 'Wrapper',
    kind: 'component',
    root: {
      id: 'root',
      type: 'frame',
      children: [{ id: 'placed-list', type: 'instance', component: list.id }],
    },
  };
  const catalog = new Map(
    [card, card2, list, wrapper].map((document) => [document.id, toFlat(document)]),
  );
  for (const document of [list, wrapper]) {
    const flat = toFlat(document);
    const field = publicFieldsFor(flat, catalog).get('items')!;
    const choices = structuralItemChoices(flat, field, catalog, catalog);
    expect(choices.map((choice) => [choice.id, choice.label])).toEqual([
      ['switch/one', 'Card'],
      ['switch/two', 'Card 2'],
    ]);
    expect(choices.map((choice) => choice.caseValue)).toEqual(['card', 'card-2']);
    expect(choices[0]?.payloadSchema?.properties?.title).toEqual({ type: 'string' });
    expect(choices[1]?.payloadSchema?.properties?.count).toEqual({ type: 'number' });
  }
});
