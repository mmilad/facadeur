import { exampleCatalog } from '@facadeur/examples';
import { defaultBreakpoints, type Breakpoint, type DocumentFile, type IconDefinition, type TokenTree } from '@facadeur/core';

export const defaultIcons: IconDefinition[] = [
  {
    id: 'select',
    name: 'Select',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22m5 3 13 11-5.6.7L9.3 20 5 3Z%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'frame',
    name: 'Frame',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect x=%224%22 y=%224%22 width=%2216%22 height=%2216%22 rx=%222%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22/%3E%3C/svg%3E',
  },
  {
    id: 'text',
    name: 'Text',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M5 5h14M12 5v14M8.5 19h7%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'image',
    name: 'Image',
    category: 'tools',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Crect x=%224%22 y=%225%22 width=%2216%22 height=%2214%22 rx=%222%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22/%3E%3Ccircle cx=%229%22 cy=%2210%22 r=%221.5%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22/%3E%3Cpath d=%22m5 17 4-4 3 3 2-2 5 4%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.8%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'chevron-down',
    name: 'Chevron down',
    category: 'controls',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22m4 6 4 4 4-4%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'search',
    name: 'Search',
    category: 'controls',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ccircle cx=%226.5%22 cy=%226.5%22 r=%223.5%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22/%3E%3Cpath d=%22m9.2 9.2 4.2 4.2%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'plus',
    name: 'Plus',
    category: 'actions',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22M8 3v10M3 8h10%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
  {
    id: 'close',
    name: 'Close',
    category: 'actions',
    src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22m4 4 8 8M12 4l-8 8%22 fill=%22none%22 stroke=%22%231c1915%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
  },
];

export interface ProjectTemplate {
  tokens: TokenTree;
  icons: IconDefinition[];
  breakpoints: Breakpoint[];
}

/** Atoms created with a new project, beside the design file. */
export const starterAtomIds = ['button', 'link'] as const;

/** Form controls created with a new project, beside the design file. */
export const starterFormIds = ['input', 'textarea'] as const;

/** Example catalog tokens are the source of truth for a new project's design library. */
export function createProjectTemplate(): ProjectTemplate {
  return {
    tokens: structuredClone(exampleCatalog.tokens),
    icons: structuredClone(defaultIcons),
    breakpoints: structuredClone(exampleCatalog.globalStyles.breakpoints ?? defaultBreakpoints),
  };
}

/** Same template as a document file, so it can be copied into a project and validated. */
export function createProjectTemplateDocument(): DocumentFile {
  const template = createProjectTemplate();
  return {
    version: 1,
    id: 'project-template',
    name: 'Project template',
    kind: 'atom',
    settings: { breakpoints: template.breakpoints },
    icons: template.icons,
    tokens: template.tokens,
    root: { id: 'root', type: 'frame', tag: 'div' },
  };
}
