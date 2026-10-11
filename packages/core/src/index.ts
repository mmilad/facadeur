export { DocumentError } from './document/errors';
export { CoreController } from './controller/project/index';
export type {
  BreakpointUuid,
  DesignTokenFamily,
  DesignTokenFamilyMap,
  DesignTokenRecord,
  DesignTokenReference,
  DesignTokenSet,
  DesignTokenUuid,
  DesignTokenValue,
  DesignTokenValueType,
  ElementBuildConfig,
  FontFamilyDefinition,
} from '@facadeur/domain';
export { NodeController } from './controller/project/node/index';
export {
  PreviewController,
  mergePreviewFields,
  previewFieldsForNode,
  resolveDefinitionToElementBuildConfig,
} from './controller/project/node/preview/index';
export {
  fieldsFromJsonSchema,
  primaryJsonSchemaType,
  type JsonSchemaField,
} from './schema/json-schema-fields';
export {
  inspectorInputsForNode,
  type InspectorInputs,
} from './controller/project/node/config/inspector';
export type {
  InspectorFormField,
  InspectorFormModel,
  InspectorFormValue,
} from './controller/project/node/preview/inspector-view';
export type { InspectorFormChangeTarget } from './controller/project/inspector-form-change';
export {
  buildInspectorFormModel,
  inspectorChangeTarget,
} from './controller/project/node/preview/inspector-view';
export { componentPropsForSchema } from './controller/project/catalog/field-ids';
export {
  designPropOptions,
  encodePropRef,
  isPropRef,
  parsePropRef,
  type DesignPropOption,
} from './controller/project/node/preview/prop-ref';
export {
  findDefinition,
  listCatalogDefinitions,
  findNodeByUuid,
  findParentOfNode,
  canAcceptCatalogChildren,
  insertCatalogNode,
  isInsideCatalogSubtree,
  moveCatalogNode,
  removeCatalogNode,
  classListFromNode,
  patchNodeData,
  patchNodeDataRecord,
  patchNodeName,
  patchNodeDomAttributes,
  patchNodeStyleRecord,
  patchNodeTagName,
  resolveJsonSchemaForDefinition,
  validateProjectCatalog,
  emptyProjectCatalog,
  assertCatalogRefIntegrity,
  applyCatalogDesignCommand,
  catalogKindForDefinition,
  createCatalogDefinition,
  deleteCatalogDefinitionRecord,
  patchCatalogDefinitionRecord,
  removeCatalogSchema,
  upsertCatalogSchema,
  upsertCatalogDesignProp,
  removeCatalogDesignProp,
  type CatalogDesignCommand,
} from './controller/project/catalog/index';
export type { CoreControllerHost } from './types/index';
export type { CatalogDefinitionPort } from './types/index';
export type { CatalogPort, CoreSnapshot } from './types/core-contracts';
export { canonicalizeJson, isJsonValue, isPlainObject, type JsonValue } from './utils';
export {
  childOverridePath,
  mergeChildFieldContext,
  mergeChildFieldOverrides,
} from './document/child-fields';
export { assertBreakpoints } from './controller/style/breakpoints';
export { assertFont, assertFonts, fontStyles } from './controller/style/fonts';
export { createCatalogUuid, createId, ID_PATTERN, TAG_PATTERN } from './document/ids';
export {
  DEFAULT_HTML_TAG_OPTIONS,
  VOID_HTML_TAGS,
  htmlTagOptions,
  isVoidHtmlTag,
} from './document/html-tags';
export { canonicalizeLayout, layoutTokenRefs, parseLayout } from './controller/style/layout';
export {
  appendStyleSelectorSuffix,
  assertStyleSelector,
  bindStyleRuleSelector,
  renderStyleRuleSelector,
  replaceSelectorClasses,
  selectorClassNames,
} from './controller/style/selectors';
export {
  defaultKinds,
  defaultNestingRules,
  nodeTypes,
  type DefaultKind,
  type NestingRule,
  type NodeType,
} from './document/kinds';
export {
  childFieldPathSchema,
  fieldTypes,
  previewDataSchema,
  type PreviewData,
  breakpointLabel,
  defaultBreakpoints,
  type Breakpoint,
  type FieldDefinition,
  type ChildFieldOverrides,
  type FieldType,
  type FieldValue,
  type JsonSchema,
  type FontFaceFile,
  type FontFamily,
  type FontFamilyValue,
  type IconDefinition,
  type FontSource,
  type FontStyle,
  type AxisSize,
  type Layout,
  type LayoutOverride,
  type Margin,
  type MarginBox,
  type SizeValue,
  type Spacing,
  type SpacingBox,
  type StyleBlock,
  type StyleChild,
  type StyleDeclarations,
  type StyleLayer,
  type StyleRule,
  type StyleStates,
  type TokenInterface,
  type TokenType,
} from './schema/document';
export {
  canonicalizeTokenTree,
  emptyTokenTree,
  readTokenTree,
  removeTokenFromTree,
  setTokenInTree,
} from './controller/style/tokens/global/tree';
export { fontFamilyTokens, tokenReferencesByType } from './controller/style/tokens/global/query';
export { tokenReference, tokenReferenceValue } from './controller/style/tokens/syntax';
export { tokenCssPropertyName } from './controller/style/tokens/global/selector';
export { tokenCustomProperty, typographyCustomProperty } from './tokens/names';
export {
  activeBreakpoints,
  configuredBreakpoints,
  fontStack,
  isBreakpointEnabled,
  loadTokens,
  quoteFamily,
  type CssProperty,
  type DesignInput,
  type ParsedToken,
  type ResolvedDesign,
} from './tokens/resolve';
export {
  type IndexedGroup,
  type IndexedToken,
  type IdentifiedTokenDefinition,
  type TokenDefinition,
  type TokenIndex,
  type TokenTier,
  type TokenTree,
} from './controller/style/tokens/types';
export {
  canonicalizeStyleBlock,
  canonicalizeTokenInterface,
} from './controller/style/blocks/parse';
export { refsInText } from './controller/style/references/text';
export { omitVariantAxis, omitVariantValues } from './controller/style/blocks/edit';
export { parseStyleBlock, parseTokenInterface } from './controller/style/blocks/parse';
export { matchesSchemaValue } from './controller/validation/index';
export {
  uuidSchema,
  schemaSourceSchema,
  domSpecSchema,
  domEventSchema,
  styleSpecSchema,
  styleRulesRefSchema,
  previewDataSchema as nodeModelPreviewDataSchema,
  nodeConfigSchema,
  definitionConfigSchema,
  nodeSchema,
  NODE_MODEL_SCHEMA_ID,
  nodeDefinitionSchema,
  nodeDefinitionKindSchema,
  projectCatalogSchema,
  projectCatalogJsonSchema,
  type NodeModel,
  type NodeDefinitionModel,
  type ProjectCatalogModel,
} from './schema/node-model/index';
