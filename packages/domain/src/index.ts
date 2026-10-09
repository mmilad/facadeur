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
  NodeDefinitionModel,
  NodeDefinitionKind,
  PreviewData,
} from './node';
export type {
  CatalogMapKey,
  DefinitionMap,
  ProjectCatalog,
  ProjectCatalogModel,
} from './catalog';
export type {
  Breakpoint,
  BreakpointUuid,
  DesignTokenIdentity,
  DesignPropDefinition,
  DesignTokenReference,
  DesignTokenRecord,
  DesignTokenFamily,
  DesignTokenFamilyMap,
  DesignTokenSet,
  DesignTokenTree,
  DesignTokenUuid,
  DesignTokenValue,
  DesignTokenValueType,
  FontFaceFile,
  FontFamilyDefinition,
  FontFamilyValue,
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
