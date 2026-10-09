import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  toFlat,
  type Command,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';
import { COMMAND_ORIGIN, createDocumentStore } from '@facadeur/store-yjs';
import * as Y from 'yjs';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

const initial: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  fields: [{ name: 'title', type: 'text', default: 'Title' }],
  root: {
    id: 'root',
    type: 'frame',
    tag: 'article',
    children: [{ id: 'title', type: 'text', tag: 'h2', text: 'Title' }],
  },
};

function run(store: ReturnType<typeof createDocumentStore>, command: Command): FlatDocument {
  const expected = applyCommand(store.getDocument(), command);
  store.execute(command);
  expect(store.getDocument()).toEqual(expected);
  return expected;
}

describe('Yjs document store', () => {
  it('preserves readable classes and ordered selector rules through load and undo', () => {
    const file: DocumentFile = {
      ...initial,
      styles: {
        rules: [
          {
            id: 'checked-title',
            selector: '.card:checked + .title',
            bindings: { card: 'root', title: 'title' },
            declarations: { color: 'red' },
          },
        ],
      },
      root: {
        id: 'root',
        type: 'frame',
        styleName: 'card',
        children: [{ id: 'title', type: 'text', styleName: 'title', text: 'Title' }],
      },
    };
    const store = createDocumentStore(file);
    expect(store.getDocument()).toEqual(toFlat(file));
    store.execute({ type: 'setProp', nodeId: 'title', prop: 'styleName', value: 'heading' });
    expect(store.getNode('title')?.styleName).toBe('heading');
    expect(store.getDocument().styles?.rules?.[0]?.selector).toBe('.card:checked + .title');
    store.undo();
    expect(store.getNode('title')?.styleName).toBe('title');
    expect(store.getDocument().styles?.rules?.[0]?.bindings).toEqual({
      card: 'root',
      title: 'title',
    });
    store.destroy();
  });

  it('preserves instance expose contracts through the Yjs codec', () => {
    if (initial.root.type !== 'frame') throw new Error('expected frame root');
    const file: DocumentFile = {
      ...initial,
      root: {
        ...initial.root,
        children: [
          ...(initial.root.children ?? []),
          {
            id: 'control',
            type: 'instance',
            component: 'input',
            expose: {
              fields: { value: 'control.value' },
              events: { commit: 'control.commit' },
            },
          },
        ],
      },
    };
    const store = createDocumentStore(file);
    expect(store.getNode('control')).toMatchObject({
      expose: {
        fields: { value: 'control.value' },
        events: { commit: 'control.commit' },
      },
    });
    expect(store.getDocument()).toEqual(toFlat(file));
    store.destroy();
  });

  it('preserves the instance automatic field forwarding preference through the Yjs codec', () => {
    const file: DocumentFile = {
      ...initial,
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'default', type: 'instance', component: 'input' },
          { id: 'opted-out', type: 'instance', component: 'input', forwardFields: false },
        ],
      },
    };
    const store = createDocumentStore(file);
    expect(store.getDocument()).toEqual(toFlat(file));
    expect(store.getNode('default')).not.toHaveProperty('forwardFields');
    expect(store.getNode('opted-out')).toMatchObject({ forwardFields: false });

    store.execute({
      type: 'setProp',
      nodeId: 'opted-out',
      prop: 'forwardFields',
      value: true,
    });
    expect(store.getNode('opted-out')).toMatchObject({ forwardFields: true });
    store.undo();
    expect(store.getNode('opted-out')).toMatchObject({ forwardFields: false });
    store.destroy();
  });

  it('persists the project schema catalog and component schema use through commands and undo', () => {
    const file: DocumentFile = {
      ...initial,
      schemaUse: { direct: { kind: 'schema', schemaId: 'button' }, defaults: { label: 'Sample' } },
      schemaCatalog: {
        schemas: [
          {
            id: 'button',
            name: 'Button',
            description: 'Reusable button contract',
            schema: {
              type: 'object',
              properties: { label: { type: 'string', default: 'Button' } },
            },
          },
        ],
      },
    };
    const store = createDocumentStore(file, {
      schemaResolverContext: {
        documents: new Map([[file.id, file]]),
        schemaCatalog: file.schemaCatalog,
      },
    });
    expect(store.getDocument()).toEqual(toFlat(file));

    const reorderedUse = { defaults: { label: 'Updated' }, direct: file.schemaUse!.direct };
    store.execute({ type: 'setSchemaUse', schemaUse: reorderedUse });
    expect(store.getDocument().schemaUse).toEqual(reorderedUse);
    store.undo();
    expect(store.getDocument().schemaUse).toEqual(file.schemaUse);

    store.execute({
      type: 'setSchemaUse',
      schemaUse: { fields: [{ name: 'title', type: { kind: 'type', type: 'string' } }] },
    });
    expect(store.getDocument().schemaUse?.fields?.[0]?.name).toBe('title');
    store.undo();
    expect(store.getDocument().schemaUse).toEqual(file.schemaUse);

    store.execute({ type: 'setSchemaCatalog', schemaCatalog: null });
    expect(store.getDocument().schemaCatalog).toBeUndefined();
    store.undo();
    expect(store.getDocument().schemaCatalog).toEqual(file.schemaCatalog);
    store.destroy();
  });

  it('round-trips and undoes sparse child field overrides', () => {
    const file: DocumentFile = {
      ...initial,
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'owner',
            type: 'instance',
            component: 'owner',
            childFields: { email: { label: 'Work email', placeholder: 'name@example.com' } },
          },
        ],
      },
    };
    const store = createDocumentStore(file);
    expect(store.getNode('owner')).toMatchObject({
      childFields: { email: { label: 'Work email', placeholder: 'name@example.com' } },
    });
    store.execute({
      type: 'setChildField',
      nodeId: 'owner',
      path: 'email',
      field: 'value',
      value: 'ada@example.com',
    });
    expect(store.getNode('owner')).toMatchObject({
      childFields: { email: { value: 'ada@example.com' } },
    });
    store.undo();
    expect(store.getNode('owner')).toMatchObject({
      childFields: { email: { label: 'Work email', placeholder: 'name@example.com' } },
    });
    store.execute({
      type: 'setChildField',
      nodeId: 'owner',
      path: 'email',
      field: 'label',
      value: null,
    });
    expect(store.getNode('owner')).toMatchObject({
      childFields: { email: { placeholder: 'name@example.com' } },
    });
    store.undo();
    expect(store.getNode('owner')).toMatchObject({
      childFields: { email: { label: 'Work email', placeholder: 'name@example.com' } },
    });
    store.destroy();
  });

  it('loads a nested file into maps and does not make that load undoable', () => {
    const store = createDocumentStore(initial);
    expect(store.getDocument()).toEqual(toFlat(initial));
    expect(store.doc.getMap('tokens')).toBeInstanceOf(Y.Map);
    expect(store.getDocument().tokens.font).toBeDefined();
    expect(store.canUndo()).toBe(false);
    store.undo();
    expect(store.getDocument()).toEqual(toFlat(initial));
    store.destroy();
  });

  it('round-trips sparse instance-root styles and reset through Yjs', () => {
    const file: DocumentFile = {
      ...initial,
      styles: {
        children: {
          control: {
            declarations: { color: fixtureTokenRef(fixtureIds.tokens.color.accent.default) },
            states: { hover: { color: 'white' } },
            breakpoints: {
              [fixtureIds.catalog.breakpoints.tablet]: { declarations: { color: 'green' } },
            },
          },
        },
      },
      settings: {
        breakpoints: [
          { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 390 },
          { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
        ],
      },
      tokenInterface: { reads: [fixtureIds.tokens.color.accent.default] },
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'control', type: 'instance', component: 'input' }],
      },
    };
    const store = createDocumentStore(file);
    expect(store.getDocument().styles?.children?.control).toEqual(file.styles?.children?.control);
    store.execute({ type: 'setStyleBlock', style: null });
    expect(store.getDocument().styles).toBeUndefined();
    store.destroy();
  });

  it('runs each command as one transaction and undoes it independently', () => {
    const store = createDocumentStore(initial);
    let transactions = 0;
    store.doc.on('afterTransaction', (transaction) => {
      if (transaction.origin === COMMAND_ORIGIN) transactions += 1;
    });

    run(store, {
      type: 'insert',
      parentId: 'root',
      node: { id: 'note', type: 'text', text: 'Note' },
    });
    run(store, { type: 'setProp', nodeId: 'title', prop: 'text', value: 'Hello' });
    expect(transactions).toBe(2);
    expect(store.getNode('note')).toMatchObject({ text: 'Note' });
    expect(store.getNode('title')).toMatchObject({ text: 'Hello' });

    store.undo();
    expect(store.getNode('title')).toMatchObject({ text: 'Title' });
    expect(store.getNode('note')).toBeDefined();
    store.undo();
    expect(store.getNode('note')).toBeUndefined();
    expect(store.canUndo()).toBe(false);

    store.redo();
    expect(store.getNode('note')).toMatchObject({ text: 'Note' });
    store.redo();
    expect(store.getNode('title')).toMatchObject({ text: 'Hello' });
    expect(store.canRedo()).toBe(false);
    store.destroy();
  });

  it('notifies subscribers and leaves the document unchanged when a command is rejected', () => {
    const store = createDocumentStore(initial);
    const reasons: string[] = [];
    const unsubscribe = store.subscribe((change) => {
      reasons.push(change.reason);
    });
    expect(() => store.execute({ type: 'remove', nodeId: 'missing' })).toThrow(
      /not in the document/,
    );
    expect(store.canUndo()).toBe(false);
    expect(reasons).toEqual([]);

    store.execute({ type: 'setProp', nodeId: 'title', prop: 'text', value: 'Next' });
    expect(reasons).toEqual(['command']);
    store.undo();
    store.redo();
    expect(reasons).toEqual(['command', 'undo', 'redo']);
    unsubscribe();
    store.undo();
    expect(reasons).toEqual(['command', 'undo', 'redo']);
    store.destroy();
  });

  it('keeps child order in a Y.Array across move and remove', () => {
    const store = createDocumentStore(initial);
    store.execute({
      type: 'insert',
      parentId: 'root',
      node: { id: 'extra', type: 'text', text: 'Extra' },
    });
    store.execute({ type: 'move', nodeId: 'title', parentId: 'root', index: 1 });
    const root = store.doc.getMap('nodes').get('root') as Y.Map<unknown>;
    const children = root.get('children');
    expect(children).toBeInstanceOf(Y.Array);
    expect((children as Y.Array<string>).toArray()).toEqual(['extra', 'title']);
    store.execute({ type: 'remove', nodeId: 'extra' });
    expect((children as Y.Array<string>).toArray()).toEqual(['title']);
    expect(store.doc.getMap('nodes').has('extra')).toBe(false);
    store.destroy();
  });
});
