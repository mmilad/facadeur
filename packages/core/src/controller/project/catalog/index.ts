export {
  classListFromNode,
  findDefinition,
  findNodeByUuid,
  patchNodeData,
  patchNodeDataRecord,
  patchNodeName,
  patchNodeDomAttributes,
  patchNodeDomText,
  patchNodeStyleRecord,
  patchNodeTagName,
  resolveJsonSchemaForDefinition,
} from './ops';
export {
  canAcceptCatalogChildren,
  findParentOfNode,
  insertCatalogNode,
  isInsideCatalogSubtree,
  moveCatalogNode,
  removeCatalogNode,
} from './tree-ops';
export {
  catalogKindForDefinition,
  createCatalogDefinition,
  deleteCatalogDefinitionRecord,
  patchCatalogDefinitionRecord,
  removeCatalogSchema,
  upsertCatalogSchema,
} from './definition-ops';
export { removeCatalogDesignProp, upsertCatalogDesignProp } from './props-ops';
export { assertCatalogRefIntegrity, emptyProjectCatalog, validateProjectCatalog } from './validate';
export { designSliceFromCatalog, mergeDesignSliceIntoCatalog } from './design-bridge';
export { applyCatalogDesignCommand, type CatalogDesignCommand } from './design-commands';
