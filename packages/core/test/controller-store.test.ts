import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createControllerStore,
  ProjectController,
  toFlat,
  type ControllerDocumentStore,
  type DocumentFile,
} from '../src/index.js';

const design: DocumentFile = {
  version: 1,
  id: 'design',
  name: 'Design',
  kind: 'page',
  root: { id: 'root', type: 'frame', children: [] },
};
const label: DocumentFile = {
  version: 1,
  id: 'label',
  name: 'Label',
  kind: 'atom',
  root: { id: 'root', type: 'text', text: 'Initial' },
};
const stores: ControllerDocumentStore[] = [];
afterEach(() => stores.splice(0).forEach((store) => store.destroy()));
function setup() {
  const project = new ProjectController({
    designDocumentId: design.id,
    documents: [design, label].map(toFlat),
  });
  const documentStore = createControllerStore(project, label.id);
  const designStore = createControllerStore(project, design.id);
  stores.push(documentStore, designStore);
  return { project, documentStore, designStore };
}

describe('controller-backed document stores', () => {
  it('observes committed controller edits and scopes style history to the owning document', () => {
    const { project, documentStore, designStore } = setup();
    const styles = project.styles.document(label.id);
    const observed: unknown[] = [];
    documentStore.subscribe((change) =>
      observed.push({ change, styles: styles.styles, document: documentStore.getDocument() }),
    );
    styles.setStyleBlock({ declarations: { opacity: '0.5' } });
    project.styles.setGlobalToken('color.primary', { $type: 'color', $value: '#123456' });
    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      change: { reason: 'command' },
      styles: { declarations: { opacity: '0.5' } },
    });
    expect(documentStore.getDocument()).toEqual(project.document(label.id).manifest);
    expect(designStore.getDocument().tokens).toEqual(project.styles.globalTokens);
    documentStore.undo();
    expect(styles.styles).toBeUndefined();
    expect(project.styles.globalTokenIndex.tokens.has('color.primary')).toBe(true);
    designStore.undo();
    expect(project.styles.globalTokenIndex.tokens.size).toBe(0);
    documentStore.redo();
    expect(styles.styles).toEqual({ declarations: { opacity: '0.5' } });
  });

  it('keeps successful batches as one undo step and preserves redo after a rejected command', () => {
    const { project, documentStore } = setup();
    const listener = vi.fn();
    documentStore.subscribe(listener);
    documentStore.execute({
      type: 'batch',
      commands: [
        { type: 'setProp', nodeId: 'root', prop: 'text', value: 'Changed' },
        { type: 'setStyle', nodeId: 'root', property: 'opacity', value: '0.4' },
      ],
    });
    expect(listener).toHaveBeenCalledTimes(1);
    documentStore.undo();
    expect(documentStore.getNode('root')).toMatchObject({ text: 'Initial' });
    expect(documentStore.canUndo()).toBe(false);
    const before = project.document(label.id).manifest;
    expect(() =>
      project.updateDocument(label.id, {
        type: 'batch',
        commands: [
          { type: 'setProp', nodeId: 'root', prop: 'text', value: 'Partial' },
          { type: 'setProp', nodeId: 'missing', prop: 'text', value: 'Invalid' },
        ],
      }),
    ).toThrow();
    expect(project.document(label.id).manifest).toEqual(before);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(documentStore.canRedo()).toBe(true);
    documentStore.redo();
    expect(documentStore.getNode('root')).toMatchObject({
      text: 'Changed',
      style: { opacity: '0.4' },
    });
  });

  it('resets only the loaded document history and reads replacements through retained views', () => {
    const { project, documentStore, designStore } = setup();
    documentStore.execute({ type: 'setProp', nodeId: 'root', prop: 'text', value: 'Edit' });
    project.styles.setGlobalToken('color.primary', { $type: 'color', $value: '#123456' });
    const listener = vi.fn();
    const unsubscribe = documentStore.subscribe(listener);
    project.replaceDocument(
      toFlat({ ...label, root: { id: 'root', type: 'text', text: 'Loaded' } }),
    );
    expect(documentStore.getNode('root')).toMatchObject({ text: 'Loaded' });
    expect(documentStore.canUndo()).toBe(false);
    expect(designStore.canUndo()).toBe(true);
    expect(listener).toHaveBeenCalledWith({ reason: 'remote', command: undefined });
    unsubscribe();
    documentStore.destroy();
    project.updateDocument(label.id, {
      type: 'setProp',
      nodeId: 'root',
      prop: 'text',
      value: 'Later',
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(documentStore.canUndo()).toBe(false);
  });
});
