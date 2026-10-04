import { applyCommand, type Command, type CommandContext } from '../document/commands/index.js';
import { DocumentError } from '../../document/errors.js';
import { canonicalizeFlat, toNested, type FlatDocument } from '../../document/flat.js';
import type { SchemaCatalog } from '../../document/schema.js';
import { DocumentController } from '../document/controller.js';
import type { DocumentControllerContext } from '../document/types.js';
import { readTokenTree } from '../style/tokens/global/tree.js';
import { StyleController } from '../style/controller.js';
import type { GlobalTokenCommand } from '../style/types.js';
import { resolveChildFieldDefinition } from '../validation/catalog.js';
import type { DocumentCommandExecutor, ProjectChange, ProjectControllerOptions } from './types.js';
import { notifyListeners } from './notifications.js';

/** Owns project documents and shared schema/token context; all mutations go through commands. */
export class ProjectController {
  private readonly manifests = new Map<string, FlatDocument>();
  private readonly controllers = new Map<string, DocumentController>();
  private readonly listeners = new Set<(change: ProjectChange) => void>();
  private readonly executeCommand: DocumentCommandExecutor;
  readonly designDocumentId: string;
  readonly styles: StyleController;
  private readonly resolverContext: DocumentControllerContext;

  constructor(options: ProjectControllerOptions) {
    this.designDocumentId = options.designDocumentId;
    this.executeCommand = options.executeCommand ?? applyCommand;
    const designDocument = () => this.requireDocument(this.designDocumentId);
    this.resolverContext = {
      documents: this.manifests,
      get schemaCatalog() {
        return designDocument().schemaCatalog;
      },
      get globalTokens() {
        return designDocument().tokens;
      },
    };
    this.replaceDocuments(options.documents);
    this.styles = new StyleController({
      designDocumentId: this.designDocumentId,
      readDocument: (id) => this.document(id).manifest,
      updateDocument: (id, command) => this.updateDocument(id, command),
    });
  }

  get designDocument() {
    return structuredClone(this.requireDocument(this.designDocumentId));
  }

  get schemaCatalog() {
    return this.designDocument.schemaCatalog;
  }

  get globalTokens() {
    return this.designDocument.tokens;
  }

  get documents(): readonly DocumentController[] {
    return [...this.controllers.values()];
  }

  /** Detached resolution snapshot for an external command/persistence adapter. */
  get commandContext(): CommandContext {
    return this.createCommandContext();
  }

  subscribe(listener: (change: ProjectChange) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Accept loaded data or history snapshots without creating a command. */
  replaceDocument(source: FlatDocument, reason: 'load' | 'undo' | 'redo' = 'load') {
    if (reason !== 'load') this.requireDocument(source.id);
    const document = canonicalizeFlat(source);
    this.manifests.set(document.id, document);
    if (!this.controllers.has(document.id)) {
      this.controllers.set(document.id, new DocumentController(document.id, this.resolverContext));
    }
    this.publish({ reason, documentId: document.id });
    return this.document(document.id);
  }

  /** Accept authoritative hydration, Undo, or remote snapshots without executing commands. */
  replaceDocuments(documents: readonly FlatDocument[]) {
    const next = new Map<string, FlatDocument>();
    for (const source of documents) {
      const document = canonicalizeFlat(source);
      if (next.has(document.id)) {
        throw new DocumentError('duplicate-document', `Duplicate document "${document.id}"`);
      }
      next.set(document.id, document);
    }
    if (!next.has(this.designDocumentId)) {
      throw new DocumentError(
        'unknown-document',
        `Project design document "${this.designDocumentId}" was not provided`,
      );
    }
    const removed = [...this.manifests.keys()].filter((id) => !next.has(id));
    this.manifests.clear();
    for (const [id, document] of next) {
      this.manifests.set(id, document);
      if (!this.controllers.has(id)) {
        this.controllers.set(id, new DocumentController(id, this.resolverContext));
      }
    }
    for (const id of this.controllers.keys()) {
      if (!next.has(id)) this.controllers.delete(id);
    }
    for (const id of removed) this.publish({ reason: 'remove', documentId: id });
    for (const id of next.keys()) this.publish({ reason: 'load', documentId: id });
  }

  document(id: string) {
    const controller = this.controllers.get(id);
    if (!controller) throw new DocumentError('unknown-document', `Unknown document "${id}"`);
    return controller;
  }

  /** Apply one core command, then replace the stored manifest while preserving controller identity. */
  updateDocument(id: string, command: Command) {
    const current = this.requireDocument(id);
    const next = this.executeCommand(
      structuredClone(current),
      command,
      this.createCommandContext(),
    );
    if (next.id !== id) {
      throw new DocumentError(
        'schema',
        `A command changed document id from "${id}" to "${next.id}"`,
      );
    }
    this.manifests.set(id, canonicalizeFlat(next));
    this.publish({
      reason: 'command',
      documentId: id,
      command,
      previousDocument: structuredClone(current),
    });
    return this.document(id);
  }

  updateSchemas(schemaCatalog: SchemaCatalog | null) {
    return this.updateDocument(this.designDocumentId, { type: 'setSchemaCatalog', schemaCatalog });
  }

  updateTokens(command: GlobalTokenCommand) {
    return this.styles.updateGlobalTokens(command);
  }

  private createCommandContext(): CommandContext {
    const context: DocumentControllerContext = {
      documents: structuredClone(this.manifests),
      schemaCatalog: this.schemaCatalog,
      globalTokens: this.globalTokens,
    };
    const nestedDocuments = new Map(
      [...context.documents].map(([id, document]) => [id, toNested(document)] as const),
    );
    return {
      resolveKind: (id) => context.documents.get(id)?.kind,
      schemaResolverContext: context,
      globalTokenPaths: new Set(readTokenTree(context.globalTokens ?? {}).tokens.keys()),
      resolveChildField: (node, path, field) =>
        resolveChildFieldDefinition(node, path, field, nestedDocuments, context.schemaCatalog),
    };
  }

  private requireDocument(id: string) {
    const document = this.manifests.get(id);
    if (!document) throw new DocumentError('unknown-document', `Unknown document "${id}"`);
    return document;
  }

  private publish(change: ProjectChange) {
    notifyListeners(this.listeners, change);
  }
}
