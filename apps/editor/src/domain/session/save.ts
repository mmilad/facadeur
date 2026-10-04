import {
  DocumentError,
  toNested,
  validateCatalog,
  type DefaultKind,
  type DocumentFile,
  type FlatDocument,
} from '@facadeur/core';
import type { ControllerDocumentStore } from '@facadeur/core';
import { renderIdForNode } from '../selection/selection-model.js';
import {
  clearDocumentSaved,
  markDocumentSaved,
  type SavedJsonBaselines,
} from '../assets/save-state.js';
import { documentToJson, saveJsonFile, type JsonFileHandle } from '../assets/files.js';
import { errorText, kindOf } from './kinds.js';
import type { EditorNotice } from './types.js';
import { migratePreviewData } from '../preview-data.js';
import { logProjectFailure } from '../project/diagnostics.js';

export function bindPersistDocumentSave(options: {
  build: () => { filename: string; document: FlatDocument; id: string };
  validate?: () => void;
  getHandle: (id: string) => JsonFileHandle | undefined;
  rememberHandle: (id: string, handle: JsonFileHandle) => void;
  markSaved: (id: string, document: FlatDocument) => void;
  setNotice: (notice: EditorNotice) => void;
  publish: () => void;
  saveDocument?: (id: string, document: FlatDocument) => Promise<FlatDocument>;
}): () => Promise<boolean> {
  return async () => {
    const target = options.build();
    if (options.saveDocument) {
      try {
        options.validate?.();
        options.setNotice({ tone: 'info', text: 'Saving…' });
        options.publish();
        const persisted = await options.saveDocument(target.id, target.document);
        options.markSaved(target.id, persisted);
        options.setNotice({ tone: 'info', text: `Saved ${target.filename}` });
        options.publish();
        return true;
      } catch (error) {
        logProjectFailure(error, { phase: 'save', document: target.document, source: 'json' });
        options.setNotice({
          tone: 'error',
          text: error instanceof Error ? error.message : 'Could not save',
        });
        options.publish();
        return false;
      }
    }
    return persistEditorJsonSave({
      filename: target.filename,
      document: target.document,
      validate: options.validate,
      handle: options.getHandle(target.id),
      onHandle: (handle) => options.rememberHandle(target.id, handle),
      onMarkedSaved: () => options.markSaved(target.id, target.document),
      setNotice: options.setNotice,
      publish: options.publish,
    });
  };
}

export function boardStoresForOrder(
  order: readonly string[],
  assetStores: ReadonlyMap<string, ControllerDocumentStore>,
) {
  return order.flatMap((id) => {
    const store = assetStores.get(id);
    return store ? [store] : [];
  });
}

export async function persistEditorJsonSave(options: {
  filename: string;
  document: FlatDocument;
  validate?: () => void;
  handle?: JsonFileHandle;
  onHandle: (handle: JsonFileHandle) => void;
  onMarkedSaved: () => void;
  setNotice: (notice: EditorNotice) => void;
  publish: () => void;
}): Promise<boolean> {
  try {
    options.validate?.();
    const result = await saveJsonFile({
      filename: options.filename,
      text: documentToJson(options.document),
      handle: options.handle,
    });
    if (result.handle) options.onHandle(result.handle);
    options.onMarkedSaved();
    const verb = result.via === 'download' ? 'Downloaded' : 'Saved';
    options.setNotice({ tone: 'info', text: `${verb} ${options.filename}` });
    options.publish();
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    options.setNotice({
      tone: 'error',
      text: error instanceof Error ? error.message : 'Could not save',
    });
    options.publish();
    return false;
  }
}

export function registerSessionAssetDocuments(options: {
  documents: readonly DocumentFile[];
  designId: string;
  getStore: (id: string) => ControllerDocumentStore;
  assetStores: Map<string, ControllerDocumentStore>;
  order: string[];
}): void {
  for (const file of options.documents) {
    if (options.assetStores.has(file.id)) {
      throw new DocumentError('duplicate-id', `Duplicate document id "${file.id}"`);
    }
    if (file.id === options.designId) continue;
    const store = options.getStore(file.id);
    options.assetStores.set(file.id, store);
    options.order.push(file.id);
  }
  if (!options.order.length) {
    throw new DocumentError('schema', 'The editor needs at least one document');
  }
}

export function applyOpenAssetChange(options: {
  id: string;
  focus?: 'root';
  keepDrillStack: boolean;
  resetDrillStack: () => void;
  assetStores: ReadonlyMap<string, ControllerDocumentStore>;
  onMissing: () => void;
  onOpened: (change: {
    openId: string;
    workspace: DefaultKind;
    tool: 'select';
    drag: null;
    selectedNodeId: string | null;
    selectedRenderId: string | null;
    clearViewport: boolean;
  }) => void;
}): void {
  if (!options.keepDrillStack) options.resetDrillStack();
  const store = options.assetStores.get(options.id);
  if (!store) {
    options.onMissing();
    return;
  }
  const doc = store.getDocument();
  const kind = kindOf(doc);
  if (options.focus === 'root') {
    options.onOpened({
      openId: options.id,
      workspace: kind,
      tool: 'select',
      drag: null,
      selectedNodeId: doc.rootId,
      selectedRenderId: renderIdForNode(doc, doc.rootId, doc.kind !== 'page'),
      clearViewport: false,
    });
    return;
  }
  options.onOpened({
    openId: options.id,
    workspace: kind,
    tool: 'select',
    drag: null,
    selectedNodeId: null,
    selectedRenderId: null,
    clearViewport: true,
  });
}

export function bindLoadDocument(
  options: Omit<Parameters<typeof loadEditorDocument>[0], 'file' | 'handle'>,
): (file: DocumentFile, handle?: JsonFileHandle) => void {
  return (file, handle) => loadEditorDocument({ ...options, file, handle });
}

export function loadEditorDocument(options: {
  file: DocumentFile;
  handle?: JsonFileHandle;
  designId: string;
  getDesignStore: () => ControllerDocumentStore;
  setDesignStore: (store: ControllerDocumentStore) => void;
  order: string[];
  assetStores: Map<string, ControllerDocumentStore>;
  handles: Map<string, JsonFileHandle>;
  savedJson: SavedJsonBaselines;
  createStore: (document: DocumentFile) => ControllerDocumentStore;
  forget: (store: ControllerDocumentStore | undefined) => void;
  watch: (store: ControllerDocumentStore, source: 'asset' | 'design') => void;
  syncKinds: () => void;
  resetDrillStack: () => void;
  onDesignLoaded: () => void;
  onAssetLoaded: (kind: DefaultKind, file: DocumentFile) => void;
  onError: (message: string) => void;
  onNoticeClear: () => void;
  publish: () => void;
}): void {
  try {
    const file = migratePreviewData(options.file);
    if (file.id === options.designId) {
      const created = options.createStore(file);
      const previous = options.getDesignStore();
      options.setDesignStore(created);
      options.forget(previous);
      previous.destroy();
      options.watch(created, 'design');
      if (options.handle) options.handles.set(file.id, options.handle);
      markDocumentSaved(options.savedJson, file.id, created.getDocument());
      options.onDesignLoaded();
      options.onNoticeClear();
      options.publish();
      return;
    }
    options.resetDrillStack();
    const nextFiles = options.order.map((id) => {
      if (id === file.id) return file;
      const store = options.assetStores.get(id);
      if (!store) throw new DocumentError('missing-node', `Missing document "${id}"`);
      return toNested(store.getDocument());
    });
    if (!options.assetStores.has(file.id)) nextFiles.push(file);
    validateCatalog(nextFiles, {
      schemaCatalog: options.getDesignStore().getDocument().schemaCatalog,
    });
    const created = options.createStore(file);
    const previous = options.assetStores.get(file.id);
    options.assetStores.set(file.id, created);
    if (!options.order.includes(file.id)) options.order.push(file.id);
    options.syncKinds();
    options.forget(previous);
    previous?.destroy();
    options.watch(created, 'asset');
    if (options.handle) options.handles.set(file.id, options.handle);
    if (options.handle || previous) {
      markDocumentSaved(options.savedJson, file.id, created.getDocument());
    } else {
      clearDocumentSaved(options.savedJson, file.id);
    }
    options.onAssetLoaded(kindOf(created.getDocument()), file);
    options.onNoticeClear();
    options.publish();
  } catch (error) {
    options.onError(errorText(error));
    options.publish();
  }
}
