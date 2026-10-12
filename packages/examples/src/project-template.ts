import { defaultBreakpoints, type Breakpoint, type TokenTree } from '@facadeur/core';
import type { IconDefinition } from '@facadeur/domain';
import { exampleCatalog } from './catalog';
import { defaultIcons } from './catalog/icons';

export { defaultIcons };

export interface ProjectTemplate {
  tokens: TokenTree;
  icons: IconDefinition[];
  breakpoints: Breakpoint[];
}

/** Example catalog tokens are the source of truth for a new project's design library. */
export function createProjectTemplate(): ProjectTemplate {
  return {
    tokens: structuredClone(exampleCatalog.tokens),
    icons: structuredClone(exampleCatalog.icons ?? defaultIcons),
    breakpoints: structuredClone(exampleCatalog.globalStyles.breakpoints ?? defaultBreakpoints),
  };
}
