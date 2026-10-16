import type { ProjectCatalog } from '@facadeur/domain';
import type {
  DesignLibraryCommand,
  GlobalTokenCommand,
  NodeClassStyleCommand,
  NodeClassStyleDeclarationsCommand,
  NodeClassConditionCommand,
} from '../../style/types';
import { assertBreakpoints, cloneBreakpoints } from '../../style/breakpoints';
import {
  emptyTokenTree,
  removeTokenFromTree,
  setTokenInTree,
} from '../../style/tokens/global/tree';
import { validateProjectCatalog } from './validate';
import {
  setNodeClassCondition,
  setNodeClassStyleDeclaration,
  setNodeClassStyleDeclarations,
} from './node-classes';

export type CatalogDesignCommand =
  | GlobalTokenCommand
  | DesignLibraryCommand
  | NodeClassStyleCommand
  | NodeClassStyleDeclarationsCommand
  | NodeClassConditionCommand;

export function applyCatalogDesignCommand(
  catalog: ProjectCatalog,
  command: CatalogDesignCommand,
): ProjectCatalog {
  if (command.type === 'setNodeClassStyleDeclaration') {
    return validateProjectCatalog(setNodeClassStyleDeclaration(catalog, command)) as ProjectCatalog;
  }
  if (command.type === 'setNodeClassStyleDeclarations') {
    return validateProjectCatalog(
      setNodeClassStyleDeclarations(catalog, command),
    ) as ProjectCatalog;
  }
  if (command.type === 'setNodeClassCondition') {
    return validateProjectCatalog(setNodeClassCondition(catalog, command)) as ProjectCatalog;
  }
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
