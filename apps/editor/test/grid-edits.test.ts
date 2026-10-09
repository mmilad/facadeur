import { expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createEditorSession } from '../src/domain/session';
import { commitGridChanges } from '../src/ui/sidebar/properties/layout/grid/edits';
import { editorStandardDesign, expandExampleCatalog } from './fixtures/example-catalog';
import { exampleIds as fixtureIds, tokenRef as fixtureTokenRef } from '@facadeur/examples';

const file: DocumentFile = {
  version: 1,
  id: 'grid-edits',
  name: 'Grid',
  kind: 'component',
  variants: [{ name: 'compact' }],
  settings: {
    breakpoints: [
      { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 },
      { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
    ],
  },
  root: {
    id: 'root',
    type: 'frame',
    style: { display: 'grid', 'grid-template-areas': '"old"', color: 'red' },
    children: [
      { id: 'child', type: 'text', text: 'Child', style: { 'grid-area': 'old', opacity: '0.5' } },
    ],
  },
};
it.each([false, true])(
  'renames parent and inline child in one Undo without touching siblings (variant: %s)',
  (variant) => {
    const session = createEditorSession({
      documents: expandExampleCatalog([file]),
      design: editorStandardDesign(),
    });
    session.openAsset('grid-edits', 'root');
    if (variant) session.setActiveVariant('compact');
    const before = structuredClone(session.getSnapshot().document);
    commitGridChanges(session, session.getSnapshot(), null, [
      { nodeId: 'root', patch: { 'grid-template-areas': '"content"' } },
      { nodeId: 'child', patch: { 'grid-area': 'content' } },
    ]);
    const active = session.getSnapshot().activeDocument;
    expect(active.nodes.root).toMatchObject({
      style: { 'grid-template-areas': '"content"', color: 'red' },
    });
    expect(active.nodes.child).toMatchObject({ style: { 'grid-area': 'content', opacity: '0.5' } });
    if (variant) expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
    session.undo();
    expect(session.getSnapshot().document).toEqual(before);
  },
);
it('builds multiple sparse viewport style owners without overwriting earlier edits', () => {
  const session = createEditorSession({
    documents: expandExampleCatalog([file]),
    design: editorStandardDesign(),
  });
  session.openAsset('grid-edits', 'root');
  session.setActiveVariant('compact');
  const before = structuredClone(session.getSnapshot().document);
  commitGridChanges(session, session.getSnapshot(), fixtureIds.catalog.breakpoints.tablet, [
    {
      nodeId: 'root',
      patch: {
        'grid-template-areas': '"content"',
        'row-gap': fixtureTokenRef(fixtureIds.tokens.space.gap.md),
      },
    },
    { nodeId: 'child', patch: { 'grid-area': 'content' } },
  ]);
  const block = session.getSnapshot().document.variantPresets?.[0]?.overrides?.styles;
  expect(block).toEqual({
    breakpoints: {
      [fixtureIds.catalog.breakpoints.tablet]: {
        declarations: {
          'grid-template-areas': '"content"',
          'row-gap': fixtureTokenRef(fixtureIds.tokens.space.gap.md),
        },
      },
    },
    children: {
      child: {
        breakpoints: {
          [fixtureIds.catalog.breakpoints.tablet]: { declarations: { 'grid-area': 'content' } },
        },
      },
    },
  });
  expect(session.getSnapshot().document.nodes).toEqual(before.nodes);
  session.undo();
  expect(session.getSnapshot().document).toEqual(before);
});
