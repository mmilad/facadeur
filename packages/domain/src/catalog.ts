import type {
  DesignPropDefinition,
  DesignTokenTree,
  FontFamilyDefinition,
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
  /** DTCG token tree (colors, dimensions, typography, …). Path ids; see {@link DesignTokenTree}. */
  readonly tokens?: DesignTokenTree;
  /** Font faces / Google families referenced by typography tokens and `{font.*}` paths. */
  readonly fonts?: readonly FontFamilyDefinition[];
  /** Semantic props for `{prop:uuid}` style references. Optional until the prop editor lands. */
  readonly props?: Readonly<Record<Uuid, DesignPropDefinition>>;
  /** Global CSS, token reads/sets, and breakpoints (legacy design file concerns). */
  readonly globalStyles?: GlobalStyles;
}

export type CatalogMapKey = 'atoms' | 'components' | 'pages';
