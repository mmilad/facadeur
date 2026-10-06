import type { DocumentFile, FieldDefinition, FieldType, SchemaCatalog } from '@facadeur/core';

export interface PropSpec {
  /** Document field or variant-axis name. */
  source: string;
  name: string;
  type: string;
  fieldType: FieldType | 'variant' | 'event';
  defaultExpr?: string;
  variantDefaultExpr?: string;
  required?: boolean;
  eventName?: string;
  eventDataType?: string;
  eventDataTypeExpr?: string;
  eventDataTypeImport?: string;
}

export interface VariantTypeSpec {
  name: string;
  union: string;
}

export interface ComponentImport {
  name: string;
  from: string;
  propsName?: string;
}

export interface ComponentFile {
  id: string;
  component: string;
  directory: string;
  props: PropSpec[];
  variantTypes: VariantTypeSpec[];
  imports: ComponentImport[];
  usesCssProperties: boolean;
  acceptsChildFields: boolean;
  usesContext: boolean;
  componentContents: string;
  typesContents: string;
  indexContents: string;
}

export type LocalClassNames = ReadonlyMap<string, string>;

export interface CatalogEntry {
  document: DocumentFile;
  schemaCatalog?: SchemaCatalog;
  /** Canonical Core-resolved public fields, including schema-derived defaults. */
  contractFields: ReadonlyMap<string, FieldDefinition>;
  component: string;
  fields: Map<string, PropSpec>;
  variants: Map<string, PropSpec>;
  events: Map<string, PropSpec>;
  namedVariant?: PropSpec;
  acceptsChildFields?: boolean;
  childFieldsProp?: string;
  acceptsContext?: boolean;
  dataContract?: {
    imports: string[];
    bases: string[];
    fields: PropSpec[];
    aliases: string[];
  };
}

export interface Attr {
  name: string;
  value:
    | { kind: 'literal'; value: string }
    | { kind: 'expr'; code: string }
    | { kind: 'bool'; value: boolean };
}

export interface TextChild {
  text: string;
}

export interface ElementNode {
  tag: string;
  attrs: Attr[];
  spreads?: string[];
  children: Array<ElementNode | TextChild>;
  void: boolean;
  fragment?: boolean;
  condition?: string;
  choice?: { value: string; cases: { value: string; node: ElementNode }[] };
  repeat?: {
    source: string;
    item: string;
    index: string;
    key: string;
  };
}

export interface Expr {
  /** Expression inside JSX braces. */
  code: string;
  /** When the prop has no default, a literal on the node is used if the prop is omitted. */
  fallback: boolean;
}

export interface Bound {
  options?: Expr;
  text?: Expr;
  attrs: Map<string, Attr['value']>;
  classExpr?: string;
  style: [string, string][];
  src?: Expr;
  alt?: Expr;
  hidden?: string;
}
