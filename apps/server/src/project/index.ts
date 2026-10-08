import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import {
  applyCommand,
  toNested,
  isPlainObject,
  validateDocumentFile,
  type Command,
  type DocumentFile,
  type SchemaCatalog,
} from '@facadeur/core';
import {
  createDocumentStore,
  readDocumentFromUpdate,
  type YjsDocumentStore,
} from '@facadeur/store-yjs';
import * as Y from 'yjs';
import {
  atomicWrite,
  decodeUpdate,
  hash,
  invalid,
  ProjectError,
  protect,
  sourceHash,
  type DurableProject,
  type ProjectState,
} from './persistence';
import { assertCommand, context, safeId, validate } from './validation';

export { ProjectError, type ProjectState } from './persistence';

export interface ProjectOptions {
  directory: string;
  stateDirectory?: string;
}
export interface ProjectSnapshot {
  id: 'default';
  documents: DocumentFile[];
  design: DocumentFile;
  sources: Record<string, string>;
  states: Record<string, ProjectState>;
}

const owners = new Set<string>();

/** All operations are synchronous: validation and durable commit finish before publication. */
export class ProjectRepository {
  private readonly directory: string;
  private readonly statePath: string;
  private durable: DurableProject;
  private readonly stores = new Map<string, YjsDocumentStore>();
  private readonly listeners = new Set<(id: string, state: ProjectState) => void>();
  private designId = '';
  private legacySchemaCatalog?: SchemaCatalog;
  private closed = false;
  private failed = false;
  private rehydrateFromSource = new Set<string>();

  constructor(options: ProjectOptions) {
    this.directory = resolve(options.directory);
    this.statePath = join(
      resolve(options.stateDirectory ?? join(this.directory, '.facadeur')),
      'project.json',
    );
    if (owners.has(this.directory)) throw new ProjectError(409, 'Project is already open');
    this.durable = { version: 1, directory: this.directory, entries: {} };
    owners.add(this.directory);
    try {
      protect(() => this.load());
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  private load(): void {
    const recovering = existsSync(this.statePath);
    if (recovering) {
      this.durable = invalid(
        () => JSON.parse(readFileSync(this.statePath, 'utf8')) as DurableProject,
      );
      this.assertDurable();
      // A pending export is a committed save. Complete it only if the source still
      // matches either side of that save; never overwrite an unrelated external edit.
      this.rehydrateFromSource.clear();
      for (const [id, entry] of Object.entries(this.durable.entries)) {
        const path = join(this.directory, entry.source);
        const current = sourceHash(path);
        if (entry.pending) {
          if (current !== entry.hash && current !== entry.pending.previousHash) {
            throw new ProjectError(409, `Externally changed source: ${entry.source}`);
          }
          if (current !== entry.hash) atomicWrite(path, entry.pending.content);
          delete entry.pending;
        } else if (current !== entry.hash) {
          // Repo or tooling updated the exported JSON. Drop the stale Yjs overlay and
          // trust the on-disk source on the next store creation pass.
          this.rehydrateFromSource.add(id);
        }
      }
    } else {
      this.rehydrateFromSource.clear();
    }
    const filenames = readdirSync(this.directory)
      .filter((name) => name.endsWith('.json') && name !== 'schemas.json')
      .sort();
    const files = filenames.map((name) => {
      sourceHash(join(this.directory, name));
      return invalid(() =>
        validateDocumentFile(JSON.parse(readFileSync(join(this.directory, name), 'utf8'))),
      );
    });
    this.designId = files[filenames.indexOf('project-template.json')]?.id ?? '';
    if (!this.designId)
      throw new ProjectError(400, 'Missing project-template.json design document');
    const design = files.find((file) => file.id === this.designId)!;
    this.legacySchemaCatalog = invalid(() =>
      readLegacySchemaCatalog(join(this.directory, 'schemas.json'), design),
    );
    // Exported JSON can intentionally lag the shared catalog (including newly
    // created unsaved dependencies). Validate the complete restored catalog below.
    if (!recovering) validate(files, this.legacySchemaCatalog);
    const restored = new Map<string, DocumentFile>();
    const restorePlan: Array<{
      file: DocumentFile;
      source: string;
      existing: DurableProject['entries'][string] | undefined;
      rehydrate: boolean;
      update: Uint8Array | undefined;
    }> = [];
    for (const [index, file] of files.entries()) {
      const source = filenames[index]!;
      const existing = Object.hasOwn(this.durable.entries, file.id)
        ? this.durable.entries[file.id]
        : undefined;
      if (existing && existing.source !== source)
        throw new ProjectError(409, `Source mapping changed for ${file.id}`);
      const rehydrate = existing ? this.rehydrateFromSource.has(file.id) : false;
      const update = existing && !rehydrate ? decodeUpdate(existing.update) : undefined;
      restored.set(file.id, update ? toNested(readDocumentFromUpdate(update)) : file);
      restorePlan.push({ file, source, existing, rehydrate, update });
    }
    for (const [id, entry] of Object.entries(this.durable.entries)) {
      if (restored.has(id)) continue;
      if (entry.hash !== null) throw new ProjectError(409, `Missing source: ${entry.source}`);
      restored.set(id, toNested(readDocumentFromUpdate(decodeUpdate(entry.update))));
    }
    // Build the resolver against the complete restored project before hydrating any
    // store. Per-file maps here would make validation depend on filename order.
    const commandContext = context([...restored.values()], this.designId, this.legacySchemaCatalog);
    for (const { file, source, existing, rehydrate, update } of restorePlan) {
      const store = invalid(() =>
        createDocumentStore(file, commandContext, update ? { update } : undefined),
      );
      this.stores.set(file.id, store);
      if (store.getDocument().id !== file.id)
        throw new ProjectError(400, 'Durable document id changed');
      const sourcePath = join(this.directory, source);
      if (!existing) {
        this.durable.entries[file.id] = {
          ...this.encode(store, 0, 0),
          source,
          hash: sourceHash(sourcePath),
        };
      } else if (rehydrate) {
        this.durable.entries[file.id] = {
          ...this.encode(store, existing.revision, existing.savedRevision),
          source,
          hash: sourceHash(sourcePath),
        };
      }
    }
    for (const [id, entry] of Object.entries(this.durable.entries)) {
      if (this.stores.has(id)) continue;
      if (entry.hash !== null) throw new ProjectError(409, `Missing source: ${entry.source}`);
      const placeholder = restored.get(id)!;
      const store = invalid(() =>
        createDocumentStore(placeholder, commandContext, { update: decodeUpdate(entry.update) }),
      );
      this.stores.set(id, store);
      if (store.getDocument().id !== id) throw new ProjectError(400, 'Durable document id changed');
    }
    validate(this.files(), this.legacySchemaCatalog);
    for (const [id, store] of this.stores) {
      if (this.encode(store, 0, 0).stateVector !== this.durable.entries[id]!.stateVector) {
        throw new ProjectError(400, 'Durable state vector does not match its update');
      }
      if (store.doc.store.pendingStructs || store.doc.store.pendingDs) {
        throw new ProjectError(400, 'Incomplete durable Yjs state');
      }
    }
    this.persist(this.durable);
  }

  private assertDurable(): void {
    invalid(() => {
      if (
        this.durable.version !== 1 ||
        this.durable.directory !== this.directory ||
        !this.durable.entries ||
        typeof this.durable.entries !== 'object' ||
        Array.isArray(this.durable.entries)
      ) {
        throw new ProjectError(400, 'Invalid durable project');
      }
      const sources = new Set<string>();
      for (const [id, entry] of Object.entries(this.durable.entries)) {
        safeId(id);
        if (
          !entry ||
          typeof entry.source !== 'string' ||
          basename(entry.source) !== entry.source ||
          !entry.source.endsWith('.json') ||
          /[\\/:]/.test(entry.source) ||
          [...entry.source].some((character) => character.charCodeAt(0) < 32) ||
          entry.source === 'schemas.json' ||
          sources.has(entry.source.toLowerCase()) ||
          !Number.isSafeInteger(entry.revision) ||
          entry.revision < 0 ||
          !Number.isSafeInteger(entry.savedRevision) ||
          entry.savedRevision < 0 ||
          entry.savedRevision > entry.revision ||
          (entry.hash !== null && !/^[a-f0-9]{64}$/.test(entry.hash))
        ) {
          throw new ProjectError(400, 'Invalid durable entry');
        }
        sources.add(entry.source.toLowerCase());
        decodeUpdate(entry.update);
        decodeUpdate(entry.stateVector);
        if (
          entry.pending &&
          (typeof entry.pending.content !== 'string' ||
            hash(entry.pending.content) !== entry.hash ||
            (entry.pending.previousHash !== null &&
              !/^[a-f0-9]{64}$/.test(entry.pending.previousHash)))
        ) {
          throw new ProjectError(400, 'Invalid pending export');
        }
      }
    });
  }

  snapshot(): ProjectSnapshot {
    this.assertOpen();
    const files = this.files();
    return {
      id: 'default',
      documents: files.filter((file) => file.id !== this.designId),
      design: files.find((file) => file.id === this.designId)!,
      sources: Object.fromEntries(
        Object.entries(this.durable.entries).map(([id, entry]) => [id, entry.source]),
      ),
      states: Object.fromEntries([...this.stores.keys()].map((id) => [id, this.getState(id)])),
    };
  }

  getState(id: string): ProjectState {
    this.getStore(id);
    const { update, stateVector, revision, savedRevision } = this.durable.entries[id]!;
    return { update, stateVector, revision, savedRevision };
  }

  getUpdate(id: string, stateVector: Uint8Array): Uint8Array {
    const store = this.getStore(id);
    return invalid(() => Y.encodeStateAsUpdate(store.doc, stateVector));
  }

  edit(id: string, command: Command, expectedRevision: number): ProjectState {
    const store = this.getStore(id);
    this.checkRevision(id, expectedRevision);
    assertCommand(command);
    const files = this.files();
    const resolverFiles =
      command.type === 'setSchemaUse' && command.schemaUse
        ? files.map((file) => (file.id === id ? { ...file, schemaUse: command.schemaUse! } : file))
        : files;
    const commandContext = context(resolverFiles, this.designId, this.legacySchemaCatalog);
    // Use the pure result once so generated insert/wrap ids are shared with the
    // store application. Remote store execution accepts a fixed id generator.
    const generated: string[] = [];
    const next = invalid(() =>
      applyCommand(store.getDocument(), command, {
        ...commandContext,
        createId: () => {
          const id = `n_${randomUUID().replaceAll('-', '')}`;
          generated.push(id);
          return id;
        },
      }),
    );
    this.validateCandidate(id, toNested(next));
    let index = 0;
    const candidate = invalid(() =>
      createDocumentStore(
        toNested(store.getDocument()),
        {
          ...commandContext,
          createId: () => generated[index++]!,
        },
        { update: Y.encodeStateAsUpdate(store.doc) },
      ),
    );
    try {
      invalid(() => candidate.executeRemote(command));
      this.validateCandidate(id, toNested(candidate.getDocument()));
      return this.commit(id, candidate);
    } finally {
      if (this.stores.get(id) !== candidate) candidate.destroy();
    }
  }

  applyUpdate(id: string, update: Uint8Array): ProjectState {
    const store = this.getStore(id);
    if (!(update instanceof Uint8Array) || !update.length)
      throw new ProjectError(400, 'Invalid Yjs update');
    const candidate = invalid(() =>
      createDocumentStore(
        toNested(store.getDocument()),
        context(this.files(), this.designId, this.legacySchemaCatalog),
        { update: Y.encodeStateAsUpdate(store.doc) },
      ),
    );
    try {
      invalid(() => candidate.applyRemoteUpdate(update));
      if (candidate.doc.store.pendingStructs || candidate.doc.store.pendingDs) {
        throw new ProjectError(400, 'Yjs update is missing dependencies');
      }
      this.validateCandidate(
        id,
        invalid(() => toNested(candidate.getDocument())),
      );
      return this.commit(id, candidate);
    } finally {
      if (this.stores.get(id) !== candidate) candidate.destroy();
    }
  }

  save(id: string, expectedRevision: number): ProjectState {
    const store = this.getStore(id);
    this.checkRevision(id, expectedRevision);
    const entry = this.durable.entries[id]!;
    const path = join(this.directory, entry.source);
    return protect(() => {
      if (sourceHash(path) !== entry.hash)
        throw new ProjectError(409, `Externally changed source: ${entry.source}`);
      const content = `${JSON.stringify(toNested(store.getDocument()), null, 2)}\n`;
      const next = structuredClone(this.durable);
      next.entries[id] = {
        ...entry,
        savedRevision: entry.revision,
        hash: hash(content),
        pending: { previousHash: entry.hash, content },
      };
      this.persist(next);
      try {
        atomicWrite(path, content);
        delete next.entries[id]!.pending;
        this.persist(next);
      } catch (error) {
        // The journal has committed. Require restart to finish it before allowing
        // any later operation to replace that recovery record.
        this.failed = true;
        throw error;
      }
      this.durable = next;
      const state = this.getState(id);
      this.publish(id, state);
      return state;
    });
  }

  create(document: DocumentFile, update?: Uint8Array): ProjectState {
    this.assertOpen();
    document = invalid(() => validateDocumentFile(document));
    safeId(document.id);
    if (this.stores.has(document.id)) throw new ProjectError(409, 'Document already exists');
    const source = `${document.id}.json`;
    if (
      Object.values(this.durable.entries).some(
        (entry) => entry.source.toLowerCase() === source.toLowerCase(),
      ) ||
      sourceHash(join(this.directory, source)) !== null
    )
      throw new ProjectError(409, 'Source already exists');
    this.validateCandidate(document.id, document);
    const candidate = invalid(() =>
      createDocumentStore(
        document,
        context([...this.files(), document], this.designId, this.legacySchemaCatalog),
        update ? { update } : undefined,
      ),
    );
    try {
      if (candidate.doc.store.pendingStructs || candidate.doc.store.pendingDs) {
        throw new ProjectError(400, 'Yjs update is missing dependencies');
      }
      this.validateCandidate(
        document.id,
        invalid(() => toNested(candidate.getDocument())),
      );
      const next = structuredClone(this.durable);
      next.entries[document.id] = { ...this.encode(candidate, 1, 0), source, hash: null };
      protect(() => this.persist(next));
      this.durable = next;
      this.stores.set(document.id, candidate);
    } catch (error) {
      candidate.destroy();
      throw error;
    }
    const state = this.getState(document.id);
    this.publish(document.id, state);
    return state;
  }

  subscribe(listener: (id: string, state: ProjectState) => void): () => void {
    this.assertOpen();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    if (this.closed) return;
    this.closed = true;
    for (const store of this.stores.values()) store.destroy();
    this.stores.clear();
    this.listeners.clear();
    owners.delete(this.directory);
  }

  private assertOpen(): void {
    if (this.closed || this.failed) throw new ProjectError(503, 'Project must be reopened');
  }

  private getStore(id: string): YjsDocumentStore {
    this.assertOpen();
    safeId(id);
    const store = this.stores.get(id);
    if (!store) throw new ProjectError(404, `Unknown document: ${id}`);
    return store;
  }

  private files(): DocumentFile[] {
    return [...this.stores.values()].map((store) => toNested(store.getDocument()));
  }

  private checkRevision(id: string, revision: number): void {
    if (!Number.isSafeInteger(revision) || revision < 0)
      throw new ProjectError(400, 'Invalid expected revision');
    if (this.durable.entries[id]!.revision !== revision)
      throw new ProjectError(409, 'Stale document revision');
  }

  private validateCandidate(id: string, document: DocumentFile): void {
    if (document.id !== id) throw new ProjectError(400, 'Document id is immutable');
    validate(
      [...this.files().filter((file) => file.id !== id), document],
      this.legacySchemaCatalog,
    );
  }

  private encode(store: YjsDocumentStore, revision: number, savedRevision: number): ProjectState {
    return {
      update: Buffer.from(Y.encodeStateAsUpdate(store.doc)).toString('base64'),
      stateVector: Buffer.from(Y.encodeStateVector(store.doc)).toString('base64'),
      revision,
      savedRevision,
    };
  }

  private persist(project: DurableProject): void {
    atomicWrite(this.statePath, `${JSON.stringify(project)}\n`);
  }

  private commit(id: string, candidate: YjsDocumentStore): ProjectState {
    const entry = this.durable.entries[id]!;
    if (
      Buffer.from(Y.encodeStateVector(candidate.doc)).toString('base64') === entry.stateVector &&
      Buffer.from(Y.encodeStateAsUpdate(candidate.doc)).toString('base64') === entry.update
    )
      return this.getState(id);
    const next = structuredClone(this.durable);
    next.entries[id] = {
      ...entry,
      ...this.encode(candidate, entry.revision + 1, entry.savedRevision),
    };
    protect(() => this.persist(next));
    // Publish the exact validated, committed server store, with its current context.
    const previous = this.getStore(id);
    this.stores.set(id, candidate);
    previous.destroy();
    this.durable = next;
    const state = this.getState(id);
    this.publish(id, state);
    return state;
  }

  private publish(id: string, state: ProjectState): void {
    for (const listener of [...this.listeners]) {
      // A subscriber cannot turn a durable successful mutation into a failed ack.
      try {
        listener(id, { ...state });
      } catch {
        /* isolate subscribers */
      }
    }
  }
}

export function openProject(options: ProjectOptions): ProjectRepository {
  return new ProjectRepository(options);
}

function readLegacySchemaCatalog(path: string, design: DocumentFile): SchemaCatalog | undefined {
  if (!existsSync(path)) return undefined;
  const library = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!isPlainObject(library) || !Array.isArray(library.schemas)) return undefined;
  return validateDocumentFile({
    ...design,
    schemaCatalog: { schemas: library.schemas },
  }).schemaCatalog;
}
