import type { Command } from '../document/commands/types';
import type { DesignLibraryCommand, GlobalTokenCommand } from '../../../controller/style/types';

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
