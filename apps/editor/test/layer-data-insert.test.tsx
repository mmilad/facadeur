// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import type { DocumentFile } from '@facadeur/core';
import { createEditorSession } from '../src/domain/session';
import { LayersPanel } from '../src/ui/sidebar/layers/LayersPanel';

const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  fields: [{ name: 'title', type: 'text', required: true }],
  root: { id: 'card-root', type: 'text', bindings: [{ target: 'text', field: 'title' }] },
};
const card2: DocumentFile = {
  version: 1,
  id: 'card2',
  name: 'Card 2',
  kind: 'section',
  fields: [{ name: 'description', type: 'text', required: true }],
  root: { id: 'card2-root', type: 'text', bindings: [{ target: 'text', field: 'description' }] },
};

afterEach(cleanup);

it('moves a sibling Switch into an empty Repeater from the middle of its layer row', () => {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      card,
      {
        version: 1,
        id: 'move-list',
        name: 'Move list',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [
            { id: 'repeat', type: 'repeater', name: 'Repeater', children: [] },
            {
              id: 'choice',
              type: 'switch',
              name: 'Switch',
              children: [{ id: 'card-choice', type: 'instance', component: card.id }],
            },
          ],
        },
      },
    ],
  });
  session.openAsset('move-list');
  const view = render(<LayersPanel session={session} snap={session.getSnapshot()} />);
  const switchRow = screen.getByRole('button', { name: 'switch Switch' });
  const repeaterRow = screen.getByRole('button', { name: 'repeater Repeater' });
  expect(switchRow).toHaveAttribute('draggable', 'true');
  Object.defineProperty(repeaterRow, 'getBoundingClientRect', {
    value: () => ({ top: 100, height: 30 }),
  });
  const dataTransfer = { setData: () => undefined, effectAllowed: '' };
  fireEvent.dragStart(switchRow, { dataTransfer });
  view.rerender(<LayersPanel session={session} snap={session.getSnapshot()} />);
  for (const type of ['dragover', 'drop']) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY: 115 });
    Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
    fireEvent(repeaterRow, event);
  }
  const snapshot = session.getSnapshot();
  expect(snapshot.document.nodes.repeat).toMatchObject({ children: ['choice'] });
  expect(snapshot.document.nodes.root).toMatchObject({ children: ['repeat'] });
  expect(snapshot.documentScopeFields.map((field) => field.name)).toEqual(['items']);
  expect(snapshot.documentScopeFields[0]?.schema?.items?.anyOf?.[0]).toMatchObject({
    properties: {
      type: { const: 'card' },
      props: { properties: { title: { type: 'string' } } },
    },
  });
  expect(snapshot.selectedNodeId).toBe('choice');
  session.undo();
  expect(session.getSnapshot().document.nodes.root).toMatchObject({
    children: ['repeat', 'choice'],
  });
});

it.each(['inside', 'below'] as const)(
  'inserts special elements %s without source fields, selects them and undoes atomically',
  (placement) => {
    for (const tool of ['Frame', 'Repeater', 'Switch']) {
      const session = createEditorSession({
        design: createProjectTemplateDocument(),
        documents: [
          {
            version: 1,
            id: 'demo',
            name: 'Demo',
            kind: 'component',
            root: {
              id: 'root',
              type: 'frame',
              children: [{ id: 'label', type: 'text', text: 'Label' }],
            },
          },
        ],
      });
      session.openAsset('demo');
      render(<LayersPanel session={session} snap={session.getSnapshot()} />);
      fireEvent.contextMenu(
        screen.getByRole('button', { name: placement === 'inside' ? 'frame root' : 'text Label' }),
      );
      fireEvent.click(screen.getByRole('menuitem', { name: `Insert ${placement}` }));
      fireEvent.click(screen.getByRole('menuitem', { name: tool }));
      const snap = session.getSnapshot();
      const inserted = snap.document.nodes[snap.selectedNodeId!];
      expect(inserted).toEqual({
        id: snap.selectedNodeId,
        name: tool,
        type: tool.toLowerCase(),
        children: [],
      });
      const root = snap.document.nodes.root;
      if (root?.type === 'frame') expect(root.children).toEqual(['label', inserted!.id]);
      session.undo();
      expect(Object.keys(session.getSnapshot().document.nodes).sort()).toEqual(['label', 'root']);
      cleanup();
    }
  },
);

it('configures CardList -> Repeater -> Switch with component/section interfaces and updates its derived items contract', () => {
  const session = createEditorSession({
    design: createProjectTemplateDocument(),
    documents: [
      card,
      card2,
      {
        version: 1,
        id: 'list',
        name: 'CardList',
        kind: 'component',
        root: { id: 'root', type: 'repeater', name: 'Repeater', children: [] },
      },
    ],
  });
  session.openAsset('list');
  const view = render(<LayersPanel session={session} snap={session.getSnapshot()} />);
  function add(name: string, parentName: string) {
    fireEvent.contextMenu(screen.getByRole('button', { name: parentName }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Insert inside' }));
    fireEvent.click(screen.getByRole('menuitem', { name }));
    view.rerender(<LayersPanel session={session} snap={session.getSnapshot()} />);
  }
  add('Switch', 'repeater Repeater');
  add('Card', 'switch Switch');
  add('Card 2', 'switch Switch');
  const snapshot = session.getSnapshot();
  expect(snapshot.layers?.children[0]?.children.map((layer) => layer.name)).toEqual([
    'Card',
    'Card 2',
  ]);
  const fields = snapshot.documentScopeFields;
  expect(fields.map((field) => field.name)).toEqual(['items']);
  expect(fields[0]?.schema).toMatchObject({
    type: 'array',
    items: {
      anyOf: [
        {
          type: 'object',
          properties: {
            type: { const: 'card' },
            props: { properties: { title: { type: 'string' } } },
          },
        },
        {
          type: 'object',
          properties: {
            type: { const: 'card-2' },
            props: { properties: { description: { type: 'string' } } },
          },
        },
      ],
    },
  });
  fireEvent.contextMenu(screen.getByRole('button', { name: 'switch Switch' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Insert inside' }));
  const submenu = within(screen.getByRole('menu', { name: 'Insert inside' }));
  expect(submenu.queryByRole('menuitem', { name: 'Frame' })).toBeNull();
  expect(submenu.queryByRole('menuitem', { name: 'Switch' })).toBeNull();
  act(() => session.undo());
  expect(session.getSnapshot().documentScopeFields[0]?.schema?.items?.anyOf?.[0]).toMatchObject({
    properties: {
      type: { const: 'card' },
      props: { properties: { title: { type: 'string' } } },
    },
  });
});
