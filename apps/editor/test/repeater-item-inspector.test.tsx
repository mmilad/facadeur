// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import {
  publicFieldsFor,
  toNested,
  withPreviewData,
  type DocumentFile,
  type SchemaCatalog,
} from '@facadeur/core';
import { renderDocument } from '@facadeur/renderer-dom';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';

const schemaCatalog: SchemaCatalog = {
  schemas: [
    {
      id: 'CardData',
      name: 'Card data',
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['card'] },
          title: { type: 'string' },
        },
        required: ['type', 'title'],
        additionalProperties: false,
      },
    },
    {
      id: 'Card2Data',
      name: 'Card 2 data',
      schema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['card2'] },
          description: { type: 'string' },
        },
        required: ['type', 'description'],
        additionalProperties: false,
      },
    },
  ],
};
const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  schemaUse: { direct: { kind: 'schema', schemaId: 'CardData' } },
  root: {
    id: 'root',
    type: 'text',
    tag: 'h2',
    bindings: [{ field: 'title', target: 'text' }],
  },
};
const card2: DocumentFile = {
  version: 1,
  id: 'card2',
  name: 'Card 2',
  kind: 'section',
  schemaUse: { direct: { kind: 'schema', schemaId: 'Card2Data' } },
  root: {
    id: 'root',
    type: 'text',
    tag: 'p',
    bindings: [{ field: 'description', target: 'text' }],
  },
};
const sessions: EditorSession[] = [];
afterEach(() => {
  cleanup();
  sessions.splice(0).forEach((session) => session.destroy());
});

function setup(rootType: 'frame' | 'repeater', multiple: boolean) {
  const repeater: DocumentFile['root'] = {
    id: 'repeat',
    name: 'Repeater',
    type: 'repeater',
    children: [
      {
        id: 'switch',
        type: 'switch',
        children: [
          { id: 'card-choice', type: 'instance', component: card.id },
          ...(multiple
            ? [{ id: 'card2-choice', type: 'instance' as const, component: card2.id }]
            : []),
        ],
      },
    ],
  };
  const list: DocumentFile = {
    version: 1,
    id: 'list',
    name: 'CardList',
    kind: 'component',
    fields: [{ name: 'note', type: 'text' }],
    previewData: { fields: { note: 'Preserve me' } },
    root: rootType === 'repeater' ? repeater : { id: 'root', type: 'frame', children: [repeater] },
  };
  const session = createEditorSession({
    documents: [card, card2, list],
    design: { ...createProjectTemplateDocument(), schemaCatalog },
  });
  sessions.push(session);
  session.openAsset('list', 'root');
  render(<App session={session} />);
  return session;
}

it('adds unlimited mixed items from a root Repeater, edits their forms and renders them', async () => {
  const session = setup('repeater', true);
  const user = userEvent.setup();
  for (const name of ['Card', 'Card 2', 'Card']) {
    await user.click(screen.getByRole('button', { name: 'Add item' }));
    await user.click(screen.getByRole('menuitem', { name }));
  }
  const first = within(screen.getByRole('group', { name: 'Card item 1' }));
  const title = first.getByRole('textbox', { name: /title/i });
  await user.type(title, 'First card');
  expect(title).toHaveFocus();
  const second = within(screen.getByRole('group', { name: 'Card 2 item 2' }));
  await user.type(second.getByRole('textbox', { name: /description/i }), 'Second type');
  await user.type(
    within(screen.getByRole('group', { name: 'Card item 3' })).getByRole('textbox', {
      name: /title/i,
    }),
    'Third card',
  );
  expect(session.getSnapshot().document.previewData?.fields).toEqual({
    note: 'Preserve me',
    items: [
      { type: 'card', props: { type: 'card', title: 'First card' } },
      { type: 'card-2', props: { type: 'card2', description: 'Second type' } },
      { type: 'card', props: { type: 'card', title: 'Third card' } },
    ],
  });
  const documents = session.boardDocuments();
  const catalog = new Map(documents.map((document) => [document.id, document]));
  const owner = toNested(session.getSnapshot().document);
  const parent = document.createElement('div');
  renderDocument(
    withPreviewData(owner, null, publicFieldsFor(owner, { documents: catalog, schemaCatalog })),
    documents,
    parent,
    { schemaCatalog },
  );
  expect(parent.textContent).toBe('First cardSecond typeThird card');
  await user.click(screen.getByRole('button', { name: 'Remove item 2' }));
  expect(session.getSnapshot().document.previewData?.fields?.items).toHaveLength(2);
  act(() => session.undo());
  expect(screen.getByRole('group', { name: 'Card 2 item 2' })).toBeVisible();
});

it('adds and renders Input rather than Card when both contracts have optional fields', async () => {
  const optionalCard: DocumentFile = {
    ...card,
    schemaUse: undefined,
    fields: [{ name: 'title', type: 'text' }],
  };
  const input: DocumentFile = {
    version: 1,
    id: 'input',
    name: 'Input',
    kind: 'component',
    fields: [
      { name: 'label', type: 'text' },
      { name: 'placeholder', type: 'text' },
    ],
    root: {
      id: 'root',
      type: 'frame',
      tag: 'label',
      children: [
        { id: 'label', type: 'text', tag: 'span', bindings: [{ field: 'label', target: 'text' }] },
        {
          id: 'control',
          type: 'frame',
          tag: 'input',
          children: [],
          bindings: [{ field: 'placeholder', target: 'attribute', name: 'placeholder' }],
        },
      ],
    },
  };
  const list: DocumentFile = {
    version: 1,
    id: 'list',
    name: 'List',
    kind: 'section',
    root: {
      id: 'root',
      type: 'frame',
      children: [
        {
          id: 'repeat',
          type: 'repeater',
          children: [
            {
              id: 'switch',
              type: 'switch',
              children: [
                { id: 'card-choice', type: 'instance', component: 'card' },
                { id: 'input-choice', type: 'instance', component: 'input' },
              ],
            },
          ],
        },
      ],
    },
  };
  const session = createEditorSession({
    documents: [optionalCard, input, list],
    design: createProjectTemplateDocument(),
  });
  sessions.push(session);
  session.openAsset('list', 'root');
  render(<App session={session} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(screen.getByRole('menuitem', { name: 'Input' }));
  const form = within(screen.getByRole('group', { name: 'Input item 1' }));
  await user.type(form.getByRole('textbox', { name: 'label' }), 'Email');
  const documents = session.boardDocuments();
  const catalog = new Map(documents.map((document) => [document.id, document]));
  const owner = toNested(session.getSnapshot().document);
  const parent = document.createElement('div');
  renderDocument(withPreviewData(owner, null, publicFieldsFor(owner, catalog)), documents, parent);
  expect(parent.querySelector('input')).not.toBeNull();
  expect(parent.querySelector('h2')).toBeNull();
  expect(parent.textContent).toBe('Email');
});

it('adds a single type directly on the Frame root and edits the same items from its Repeater', async () => {
  const session = setup('frame', false);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  expect(screen.queryByRole('menu', { name: 'Choose item type' })).toBeNull();
  expect(screen.getByRole('group', { name: 'Card item 1' })).toBeVisible();
  act(() => session.selectNode('repeat'));
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.type(
    within(screen.getByRole('group', { name: 'Card item 2' })).getByRole('textbox', {
      name: /title/i,
    }),
    'From repeater',
  );
  expect(session.getSnapshot().document.previewData?.fields?.items).toEqual([
    { type: 'card', props: { type: 'card', title: '' } },
    { type: 'card', props: { type: 'card', title: 'From repeater' } },
  ]);
  expect(session.getSnapshot().document.fields.map((field) => field.name)).toEqual(['note']);
});
