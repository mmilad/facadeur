import type { ProjectCatalog } from '@facadeur/domain';
import { exampleCatalog } from './catalog';
import { defaultIcons } from './catalog/icons';
import { facadeurDesignPages } from './facadeur-editor';
import { facadeurComponentCatalog } from './facadeur-editor/components';

const facadeurIconIds = new Set([
  'assets',
  'colors',
  'components',
  'global-styles',
  'menu',
  'radius',
  'save',
  'saved',
  'schema',
  'settings',
  'shadow',
  'spacing',
  'typography',
  'viewport',
  'workspace',
]);

/** Build the app seed Catalog without the legacy Example atoms and pages. */
export function createFacadeurEditorCatalog(): ProjectCatalog {
  return structuredClone({
    atoms: {},
    components: facadeurComponentCatalog,
    pages: facadeurDesignPages,
    schemas: {},
    tokens: exampleCatalog.tokens,
    icons: defaultIcons.filter((icon) => facadeurIconIds.has(icon.id)),
    globalStyles: exampleCatalog.globalStyles,
  } satisfies ProjectCatalog);
}
