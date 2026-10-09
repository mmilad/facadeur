import type {
  DesignPropDefinition,
  DesignTokenSet,
  GlobalStyles,
} from './design-system';
import type { JsonSchemaObject } from './schema-source';
import type { NodeDefinition } from './node';
import type { Uuid } from './uuid';

export type DefinitionMap = Readonly<Record<Uuid, NodeDefinition>>;

export interface ProjectCatalog {
  readonly atoms: DefinitionMap;
  readonly components: DefinitionMap;
  readonly pages: DefinitionMap;
  readonly schemas?: Readonly<Record<Uuid, JsonSchemaObject>>;
  /** Canonical UUID-keyed design token families, including font families. */
  readonly tokens?: DesignTokenSet;
  /** Semantic props for `{prop:uuid}` style references. Optional until the prop editor lands. */
  readonly props?: Readonly<Record<Uuid, DesignPropDefinition>>;
  /** Global CSS, token reads/sets, and breakpoints (legacy design file concerns). */
  readonly globalStyles?: GlobalStyles;
}

export type ProjectCatalogModel = ProjectCatalog;

export type CatalogMapKey = 'atoms' | 'components' | 'pages';
