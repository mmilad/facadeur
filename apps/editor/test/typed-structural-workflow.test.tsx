// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { publicFieldsFor, toNested, withPreviewData, type DocumentFile } from '@facadeur/core';
import { renderDocument } from '@facadeur/renderer-dom';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  fields: [{ name: 'title', type: 'text' }],
  root: { id: 'root', type: 'text', tag: 'h2', bindings: [{ field: 'title', target: 'text' }] },
};
const textarea: DocumentFile = {
  ...card,
  id: 'textarea',
  name: 'Textarea',
  root: {
    id: 'root',
    type: 'text',
    tag: 'textarea',
    bindings: [{ field: 'title', target: 'text' }],
  },
};
const owner: DocumentFile = {
  version: 1,
  id: 'owner',
  name: 'Typed list',
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
              { id: 'card-case', type: 'instance', component: 'card' },
              { id: 'textarea-case', type: 'instance', component: 'textarea' },
            ],
          },
        ],
      },
    ],
  },
};
const sessions: EditorSession[] = [];
afterEach(() => {
  cleanup();
  sessions.splice(0).forEach((session) => session.destroy());
});

it('selects an explicit type for identical payload schemas, edits its form and supports Undo', async () => {
  const session = createEditorSession({
    documents: [card, textarea, owner],
    design: createProjectTemplateDocument(),
  });
  sessions.push(session);
  session.openAsset('owner', 'root');
  render(<App session={session} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(screen.getByRole('menuitem', { name: 'Textarea' }));
  const form = within(screen.getByRole('group', { name: 'Textarea item 1' }));
  await user.type(form.getByRole('textbox', { name: 'title' }), 'Explicit textarea');
  expect(session.getSnapshot().document.previewData?.fields?.items).toEqual([
    { type: 'textarea', props: { title: 'Explicit textarea' } },
  ]);
  const documents = session.boardDocuments();
  const catalog = new Map(documents.map((document) => [document.id, document]));
  const doc = toNested(session.getSnapshot().document);
  const parent = document.createElement('div');
  renderDocument(withPreviewData(doc, null, publicFieldsFor(doc, catalog)), documents, parent);
  expect(parent.querySelector('textarea')).toHaveValue('Explicit textarea');
  expect(parent.querySelector('h2')).toBeNull();
  expect([...publicFieldsFor(doc, catalog).keys()]).toEqual(['items']);
  await user.click(screen.getByRole('button', { name: 'Remove item 1' }));
  act(() => session.undo());
  expect(screen.getByRole('group', { name: 'Textarea item 1' })).toBeInTheDocument();
  await user.selectOptions(screen.getByRole('combobox', { name: 'Type' }), 'card');
  expect(session.getSnapshot().document.previewData?.fields?.items).toEqual([
    { type: 'card', props: { title: 'Explicit textarea' } },
  ]);
  expect(screen.getByRole('group', { name: 'Card item 1' })).toBeInTheDocument();
});

it('honors a custom case value while keeping the component payload schema contained', async () => {
  const session = createEditorSession({
    documents: [card, textarea, owner],
    design: createProjectTemplateDocument(),
  });
  sessions.push(session);
  session.openAsset('owner', 'root');
  session.execute({ type: 'setProp', nodeId: 'textarea-case', prop: 'switchCase', value: 'A' });
  render(<App session={session} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(screen.getByRole('menuitem', { name: /Textarea/ }));
  expect(session.getSnapshot().document.previewData?.fields?.items).toEqual([
    { type: 'A', props: { title: '' } },
  ]);
  expect(screen.getByRole('group', { name: /Textarea item 1/ })).toBeInTheDocument();
  const documents = session.boardDocuments();
  const catalog = new Map(documents.map((document) => [document.id, document]));
  const doc = toNested(session.getSnapshot().document);
  const parent = document.createElement('div');
  renderDocument(withPreviewData(doc, null, publicFieldsFor(doc, catalog)), documents, parent);
  expect(parent.querySelector('textarea')).not.toBeNull();
  expect(parent.querySelector('h2')).toBeNull();
});

it('offers local item and branch payload fields for conditions without leaking them onto root', async () => {
  const session = createEditorSession({
    documents: [card, textarea, owner],
    design: createProjectTemplateDocument(),
  });
  sessions.push(session);
  session.openAsset('owner', 'root');
  session.selectNode('textarea-case');
  render(<App session={session} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add condition' }));
  const picker = screen.getByRole('combobox', { name: 'Field' });
  const paths = within(picker)
    .getAllByRole('option')
    .map((option) => (option as HTMLOptionElement).value);
  expect(paths).toEqual(
    expect.arrayContaining(['item.type', 'item.props.title', 'props.title', 'index']),
  );
  await user.selectOptions(picker, 'props.title');
  expect(session.getSnapshot().document.nodes['textarea-case']?.displayOn).toEqual({
    path: 'props.title',
    truthy: true,
  });
  const catalog = new Map(session.boardDocuments().map((document) => [document.id, document]));
  expect([...publicFieldsFor(session.getSnapshot().document, catalog).keys()]).toEqual(['items']);
});

it('derives a nested repeater contract and lets its injected form choose every case', async () => {
  if (owner.root.type !== 'frame') throw new Error('Expected the fixture root frame');
  const group: DocumentFile = {
    version: 1,
    id: 'group',
    name: 'Group',
    kind: 'component',
    root: owner.root.children![0]!,
  };
  const outer: DocumentFile = {
    version: 1,
    id: 'outer',
    name: 'Outer list',
    kind: 'section',
    root: {
      id: 'root',
      type: 'repeater',
      children: [{ id: 'group-case', type: 'instance', component: group.id }],
    },
  };
  const session = createEditorSession({
    documents: [card, textarea, group, outer],
    design: createProjectTemplateDocument(),
  });
  sessions.push(session);
  session.openAsset(outer.id, 'root');
  render(<App session={session} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add item' }));
  await user.click(screen.getByRole('button', { name: 'Add items item' }));
  await user.click(screen.getByRole('menuitem', { name: 'textarea' }));
  await user.type(screen.getByRole('textbox', { name: 'title' }), 'Nested title');
  expect(session.getSnapshot().document.previewData?.fields?.items).toEqual([
    { type: 'group', props: { items: [{ type: 'textarea', props: { title: 'Nested title' } }] } },
  ]);
  const documents = session.boardDocuments();
  const catalog = new Map(documents.map((document) => [document.id, document]));
  const doc = toNested(session.getSnapshot().document);
  const host = document.createElement('div');
  renderDocument(withPreviewData(doc, null, publicFieldsFor(doc, catalog)), documents, host);
  expect(host.querySelector('textarea')).toHaveValue('Nested title');
  expect(host.querySelector('h2')).toBeNull();
  expect([...publicFieldsFor(doc, catalog).keys()]).toEqual(['items']);
});
