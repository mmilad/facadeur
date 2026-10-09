import type { Breakpoint, FontFamily } from '../../schema/document';
import type { DesignTokenFamily } from '@facadeur/domain';
import { DocumentStyle } from './document';
import { readTokenTree } from './tokens/global/tree';
import type { TokenDefinition } from './tokens/types';
import type { GlobalTokenCommand, StyleControllerContext } from './types';

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
    return Object.values(this.globalTokens.font) as FontFamily[];
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

  setGlobalToken(family: DesignTokenFamily, token: TokenDefinition) {
    return this.updateGlobalTokens({ type: 'setToken', family, token });
  }

  removeGlobalToken(family: DesignTokenFamily, uuid: string) {
    return this.updateGlobalTokens({ type: 'removeToken', family, uuid });
  }

  setFont(font: FontFamily) {
    return this.setGlobalToken('font', font);
  }

  removeFont(uuid: string) {
    return this.removeGlobalToken('font', uuid);
  }

  setBreakpoints(breakpoints: Breakpoint[]) {
    return this.context.updateDocument(this.context.designDocumentId, {
      type: 'setBreakpoints',
      breakpoints,
    });
  }
}
