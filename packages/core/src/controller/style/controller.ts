import type { Breakpoint, FontFamily } from '../../schema/document.js';
import { DocumentStyle } from './document.js';
import { readTokenTree } from './tokens/global/tree.js';
import type { TokenDefinition, TokenGroupDefinition } from './tokens/types.js';
import type { GlobalTokenCommand, StyleControllerContext } from './types.js';

/** Project-wide style editing facade. Document edits require an explicit document scope. */
export class StyleController {
  private readonly documents = new Map<string, DocumentStyle>();

  constructor(private readonly context: StyleControllerContext) {}

  get globalTokens() {
    return this.context.readDocument(this.context.designDocumentId).tokens;
  }

  get globalTokenIndex() {
    return readTokenTree(this.globalTokens);
  }

  get fonts() {
    return this.context.readDocument(this.context.designDocumentId).fonts;
  }

  get breakpoints() {
    return this.context.readDocument(this.context.designDocumentId).settings.breakpoints;
  }

  document(id: string) {
    // Validate existence before caching a view; snapshots are always read live.
    this.context.readDocument(id);
    let document = this.documents.get(id);
    if (!document) {
      document = new DocumentStyle(id, this.context);
      this.documents.set(id, document);
    }
    return document;
  }

  updateGlobalTokens(command: GlobalTokenCommand) {
    return this.context.updateDocument(this.context.designDocumentId, command);
  }

  setGlobalToken(path: string, token: TokenDefinition) {
    return this.updateGlobalTokens({ type: 'setToken', path, token });
  }

  removeGlobalToken(path: string) {
    return this.updateGlobalTokens({ type: 'removeToken', path });
  }

  setGlobalTokenGroup(path: string, group: TokenGroupDefinition) {
    return this.updateGlobalTokens({ type: 'setTokenGroup', path, group });
  }

  removeGlobalTokenGroup(path: string) {
    return this.updateGlobalTokens({ type: 'removeTokenGroup', path });
  }

  setFont(font: FontFamily) {
    return this.context.updateDocument(this.context.designDocumentId, { type: 'setFont', font });
  }

  removeFont(id: string) {
    return this.context.updateDocument(this.context.designDocumentId, { type: 'removeFont', id });
  }

  setBreakpoints(breakpoints: Breakpoint[]) {
    return this.context.updateDocument(this.context.designDocumentId, {
      type: 'setBreakpoints',
      breakpoints,
    });
  }
}
