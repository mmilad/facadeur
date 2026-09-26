import { describe, expect, it } from 'vitest';
import { pushDrillFrame, stackThroughParent } from '../src/domain/drill-navigation.js';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import link from '../../../examples/link.json';
import input from '../../../examples/input.json';
import textarea from '../../../examples/textarea.json';
import card from '../../../examples/card.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession } from '../src/domain/session.js';

const documents = validateCatalog([
  button,
  link,
  input,
  textarea,
  card,
  signIn,
  specimenSection,
  specimenPage,
]);

function session() {
  return createEditorSession({
    documents,
    design: createProjectTemplateDocument(),
    sources: { specimen: 'specimen-page.json' },
  });
}

describe('drill-navigation helpers', () => {
  it('pushes frames immutably', () => {
    const first = pushDrillFrame([], {
      documentId: 'specimen',
      documentName: 'Specimen',
      instanceNodeId: 'specimen-section',
    });
    expect(first).toHaveLength(1);
    const second = pushDrillFrame(first, {
      documentId: 'specimen-section',
      documentName: 'Specimen section',
      instanceNodeId: 'cta',
    });
    expect(second).toHaveLength(2);
    expect(first).toHaveLength(1);
  });

  it('truncates the stack through a parent index', () => {
    const stack = [
      { documentId: 'a', documentName: 'A', instanceNodeId: 'i1' },
      { documentId: 'b', documentName: 'B', instanceNodeId: 'i2' },
    ];
    expect(stackThroughParent(stack, 0)).toEqual([]);
    expect(stackThroughParent(stack, 1)).toEqual([stack[0]]);
  });
});

describe('editor drill stack', () => {
  it('starts empty and stays empty on tree open', () => {
    const editor = session();
    expect(editor.getSnapshot().drillParents).toEqual([]);
    editor.selectNode('specimen-section');
    editor.drillToMaster('specimen-section');
    expect(editor.getSnapshot().openId).toBe('specimen-section');
    expect(editor.getSnapshot().drillParents).toHaveLength(1);
    editor.openAsset('button');
    expect(editor.getSnapshot().drillParents).toEqual([]);
  });

  it('pushes on drill and pops through parent navigation with selection', () => {
    const editor = session();
    editor.selectNode('specimen-section');
    editor.drillToMaster('specimen-section');
    let snap = editor.getSnapshot();
    expect(snap.openId).toBe('specimen-section');
    expect(snap.drillParents).toMatchObject([
      { documentId: 'specimen', instanceNodeId: 'specimen-section', documentName: 'Specimen' },
    ]);

    editor.selectNode('btn-primary');
    editor.drillToMaster('button');
    snap = editor.getSnapshot();
    expect(snap.openId).toBe('button');
    expect(snap.drillParents).toHaveLength(2);

    editor.navigateDrillParent(1);
    snap = editor.getSnapshot();
    expect(snap.openId).toBe('specimen-section');
    expect(snap.selectedNodeId).toBe('btn-primary');
    expect(snap.drillParents).toHaveLength(1);

    editor.navigateDrillParent(0);
    snap = editor.getSnapshot();
    expect(snap.openId).toBe('specimen');
    expect(snap.selectedNodeId).toBe('specimen-section');
    expect(snap.drillParents).toEqual([]);
  });

  it('resets the stack when loading a document from disk', () => {
    const editor = session();
    editor.selectNode('specimen-section');
    editor.drillToMaster('specimen-section');
    expect(editor.getSnapshot().drillParents).toHaveLength(1);
    editor.loadDocument({
      version: 1,
      id: 'badge',
      name: 'Badge',
      kind: 'atom',
      root: { id: 'root', type: 'text', tag: 'span', text: 'New' },
    });
    expect(editor.getSnapshot().drillParents).toEqual([]);
  });

  it('opens the parent without selection when the drilled instance is missing', () => {
    const editor = session();
    editor.selectNode('specimen-section');
    editor.drillToMaster('specimen-section');
    const specimenStore = editor
      .boardStores()
      .find((store) => store.getDocument().id === 'specimen');
    specimenStore?.execute({ type: 'remove', nodeId: 'specimen-section' });
    editor.navigateDrillParent(0);
    const snap = editor.getSnapshot();
    expect(snap.openId).toBe('specimen');
    expect(snap.selectedNodeId).toBeNull();
  });
});
