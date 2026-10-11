import {
  defaultBreakpoints,
  type Breakpoint,
  type DocumentFile,
  type TokenTree,
} from '@facadeur/core';
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

/**
 * @deprecated Legacy DocumentFile seed for API and Store Yjs. New Catalog code should use
 * createProjectTemplate(); remove this after those boundaries migrate.
 */
export function createProjectTemplateDocument(): DocumentFile {
  const template = createProjectTemplate();
  return {
    version: 1,
    id: 'project-template',
    name: 'Project template',
    kind: 'atom',
    settings: { breakpoints: template.breakpoints },
    icons: [...template.icons],
    tokens: template.tokens,
    root: { id: 'root', type: 'frame', tag: 'div' },
  };
}
