import type { FlatDocument } from '../../document/flat';
import type { Command } from '../../legacy/flat/document/commands/types';
import type { DocumentController } from '../../legacy/flat/document/controller';

export type GlobalTokenCommand = Extract<
  Command,
  { type: 'setToken' | 'removeToken' }
>;

export type DesignLibraryCommand = Extract<Command, { type: 'setBreakpoints' }>;

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
      | 'renameComponentTokenPath'
      ;
  }
>;

export type StyleCommand = GlobalTokenCommand | DesignLibraryCommand | DocumentStyleCommand;

/** Project-owned reads and writes; successful writes return the live document view. */
export interface StyleControllerContext {
  designDocumentId: string;
  readDocument: (id: string) => FlatDocument;
  updateDocument: (id: string, command: StyleCommand) => DocumentController;
}
