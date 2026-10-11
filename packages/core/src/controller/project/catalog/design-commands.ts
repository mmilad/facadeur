import type { ProjectCatalog } from '@facadeur/domain';
import type { DesignLibraryCommand, GlobalTokenCommand } from '../../style/types';
import { assertBreakpoints, cloneBreakpoints } from '../../style/breakpoints';
import {
  emptyTokenTree,
  removeTokenFromTree,
  setTokenInTree,
} from '../../style/tokens/global/tree';
import { validateProjectCatalog } from './validate';

export type CatalogDesignCommand = GlobalTokenCommand | DesignLibraryCommand;

export function applyCatalogDesignCommand(
  catalog: ProjectCatalog,
  command: CatalogDesignCommand,
): ProjectCatalog {
  if (command.type === 'setToken') {
    const tokens = setTokenInTree(
      catalog.tokens ?? emptyTokenTree(),
      command.family,
      command.token,
    );
    return validateProjectCatalog({ ...catalog, tokens }) as ProjectCatalog;
  }
  if (command.type === 'removeToken') {
    const tokens = removeTokenFromTree(
      catalog.tokens ?? emptyTokenTree(),
      command.family,
      command.uuid,
    );
    return validateProjectCatalog({ ...catalog, tokens }) as ProjectCatalog;
  }

  const globalStyles = { ...(catalog.globalStyles ?? {}) };
  if (command.breakpoints.length) {
    assertBreakpoints(command.breakpoints);
    globalStyles.breakpoints = cloneBreakpoints(command.breakpoints);
  } else {
    delete globalStyles.breakpoints;
  }
  return validateProjectCatalog({ ...catalog, globalStyles }) as ProjectCatalog;
}
