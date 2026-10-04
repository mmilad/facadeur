import type {
  FieldDefinition,
  FieldValue,
  FlatDocument,
  FlatNode,
  SchemaCatalog,
} from '@facadeur/core';

export interface NestedSelection {
  ownerNodeId: string;
  instancePath: string;
  renderId: string;
  node: FlatNode;
  document: FlatDocument;
  /** Prepared component document containing the selected rendered node. */
  target?: FlatDocument;
  containingInstance?: Extract<FlatNode, { type: 'instance' }>;
  resolvedFields?: Record<string, FieldValue>;
  inheritedFields?: Record<string, FieldValue>;
  fieldContext?: NestedFieldContext | null;
}

export interface NestedFieldContext {
  instancePath: string;
  instance: Extract<FlatNode, { type: 'instance' }>;
  target: FlatDocument;
  fields: FieldDefinition[];
  values: Record<string, FieldValue>;
  inheritedValues?: Record<string, FieldValue>;
  overrides?: Record<string, FieldValue>;
  boundFields: readonly string[];
}

export interface VirtualLayerOptions {
  catalog?: ReadonlyMap<string, FlatDocument>;
  schemaCatalog?: SchemaCatalog;
  paintRoot?: boolean;
  prepareDocument?: (document: FlatDocument, variant?: string) => FlatDocument;
}

export interface VirtualLayerItem {
  id: string;
  address: string;
  documentId: string;
  name: string;
  type: FlatNode['type'];
  children: VirtualLayerItem[];
  virtual: boolean;
  ownerNodeId?: string;
  instancePath?: string;
  fieldEditable: boolean;
}
