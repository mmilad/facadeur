import type { DocumentFile, FieldType } from '@facadeur/core';

export interface PropSpec {
  /** Document field or variant-axis name. */
  source: string;
  name: string;
  type: string;
  fieldType: FieldType | 'variant';
  defaultExpr?: string;
}

export interface VariantTypeSpec {
  name: string;
  union: string;
}

export interface ComponentImport {
  name: string;
  from: string;
}

export interface ComponentFile {
  id: string;
  component: string;
  path: string;
  props: PropSpec[];
  variantTypes: VariantTypeSpec[];
  imports: ComponentImport[];
  usesCssProperties: boolean;
  contents: string;
}

export interface CatalogEntry {
  document: DocumentFile;
  component: string;
  fields: Map<string, PropSpec>;
  variants: Map<string, PropSpec>;
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
  children: Array<ElementNode | TextChild>;
  void: boolean;
}

export interface Expr {
  /** Expression inside JSX braces. */
  code: string;
  /** When the prop has no default, a literal on the node is used if the prop is omitted. */
  fallback: boolean;
}

export interface Bound {
  text?: Expr;
  attrs: Map<string, Attr['value']>;
  classExpr?: string;
  style: [string, string][];
  src?: Expr;
  alt?: Expr;
  hidden?: string;
}
