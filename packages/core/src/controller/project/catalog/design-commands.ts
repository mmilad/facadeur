import type { ProjectCatalog } from '@facadeur/domain';
import { readTokenTree } from '../../style/tokens/global/tree';
import type { CommandContext } from '../../../legacy/flat/document/commands/types';
import { applyStyleCommand } from '../../style/commands';
import type { DesignLibraryCommand, GlobalTokenCommand } from '../../style/types';
import { designSliceFromCatalog, mergeDesignSliceIntoCatalog } from './design-bridge';
import { validateProjectCatalog } from './validate';

export type CatalogDesignCommand = GlobalTokenCommand | DesignLibraryCommand;

export function applyCatalogDesignCommand(
  catalog: ProjectCatalog,
  command: CatalogDesignCommand,
): ProjectCatalog {
  const slice = designSliceFromCatalog(catalog);
  const context: CommandContext = {
    globalTokenPaths: new Set(readTokenTree(slice.tokens).tokens.keys()),
  };
  applyStyleCommand(slice, command, context);
  return validateProjectCatalog(mergeDesignSliceIntoCatalog(catalog, slice)) as ProjectCatalog;
}
