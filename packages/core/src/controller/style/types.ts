import type { FlatDocument } from '../../document/flat.js';
import type { Command } from '../document/commands/types.js';
import type { DocumentController } from '../document/controller.js';

export type GlobalTokenCommand = Extract<
  Command,
  { type: 'setToken' | 'removeToken' | 'setTokenGroup' | 'removeTokenGroup' }
>;

export type DesignLibraryCommand = Extract<
  Command,
  { type: 'setFont' | 'removeFont' | 'setBreakpoints' }
>;

export type DocumentStyleCommand = Extract<
  Command,
  {
    type:
      | 'setStyle'
      | 'setStyleBlock'
      | 'setVariantStyleBlock'
      | 'setTokenInterface'
      | 'setComponentToken'
      | 'removeComponentToken'
      | 'renameComponentTokenPath';
  }
>;

export type StyleCommand = GlobalTokenCommand | DesignLibraryCommand | DocumentStyleCommand;

/** Project-owned reads and writes; successful writes return the live document view. */
export interface StyleControllerContext {
  designDocumentId: string;
  readDocument: (id: string) => FlatDocument;
  updateDocument: (id: string, command: StyleCommand) => DocumentController;
}
