import type { Command } from '../../legacy/flat/document/commands/types';

export type GlobalTokenCommand = Extract<Command, { type: 'setToken' | 'removeToken' }>;

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
      | 'renameComponentTokenPath';
  }
>;

export type StyleCommand = GlobalTokenCommand | DesignLibraryCommand | DocumentStyleCommand;
