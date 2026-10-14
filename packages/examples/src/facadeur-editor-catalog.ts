import type { ProjectCatalog } from '@facadeur/domain';
import { exampleCatalog } from './catalog';
import { defaultIcons } from './catalog/icons';
import { facadeurDesignPages } from './facadeur-editor';
import { facadeurComponentCatalog } from './facadeur-editor/components';

const facadeurIconIds = new Set([
  'assets',
  'colors',
  'components',
  'frame',
  'global-styles',
  'menu',
  'radius',
  'save',
  'saved',
  'schema',
  'select',
  'settings',
  'shadow',
  'spacing',
  'typography',
  'viewport',
  'workspace',
]);

export const facadeurEditorIcons = defaultIcons.filter((icon) => facadeurIconIds.has(icon.id));

/** Build the app seed Catalog without the legacy Example atoms and pages. */
export function createFacadeurEditorCatalog(): ProjectCatalog {
  return structuredClone({
    atoms: {},
    components: facadeurComponentCatalog,
    pages: facadeurDesignPages,
    schemas: {},
    tokens: exampleCatalog.tokens,
    icons: facadeurEditorIcons,
    globalStyles: exampleCatalog.globalStyles,
  } satisfies ProjectCatalog);
}
