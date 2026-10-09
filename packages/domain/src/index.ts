/**
 * @facadeur/domain — types and interfaces only. No runtime exports.
 * Use `export type` at package boundaries when re-exporting from other packages.
 */
export type { Uuid } from './uuid';
export type { FieldValue } from './field-value';
export type { JsonSchemaObject, SchemaSource } from './schema-source';
export type { DomSpec } from './dom';
export type {
  DefinitionConfig,
  FieldExposure,
  Node,
  NodeConfig,
  NodeDefinition,
  NodeDefinitionKind,
  PreviewData,
} from './node';
export type { CatalogMapKey, DefinitionMap, ProjectCatalog } from './catalog';
export type {
  Breakpoint,
  DesignPropDefinition,
  DesignTokenTree,
  FontFaceFile,
  FontFamilyDefinition,
  FontSource,
  FontStyle,
  GlobalStyleBlock,
  GlobalStyleRule,
  GlobalStyles,
  LayerMap,
  StyleChildLayer,
  StyleDeclarations,
  StyleLayer,
  StyleStates,
  TokenInterface,
  VariantStyleMap,
} from './design-system';
export type { ElementBuildConfig } from './element-build';
export type { CatalogPort, CoreSnapshot } from './core-contracts';
