import type { DomSpec } from './dom';
import type { FieldValue } from './field-value';
import type { SchemaSource } from './schema-source';
import type { Uuid } from './uuid';

export interface PreviewData {
  readonly fields?: Readonly<Record<string, FieldValue>>;
}

export interface NodeConfig {
  readonly definitionRef?: Uuid;
  readonly previewData?: PreviewData;
}

export interface DefinitionConfig {
  readonly previewData?: PreviewData;
}

export interface Node {
  readonly uuid: Uuid;
  /** Editor-facing label for this authored element, independent of its HTML tag. */
  readonly name?: string;
  readonly dom: DomSpec & { readonly children?: readonly Node[] };
  readonly style?: Readonly<Record<string, string>>;
  readonly schema?: SchemaSource;
  readonly data?: Readonly<Record<string, FieldValue>>;
  readonly config?: NodeConfig;
}

export type NodeDefinitionKind = 'atom' | 'component' | 'page';

export interface NodeDefinition {
  readonly uuid: Uuid;
  readonly name: string;
  readonly kind: NodeDefinitionKind;
  readonly schema: SchemaSource;
  readonly root: Node;
  readonly style?: { readonly kind: 'ref'; readonly uuid: Uuid };
  readonly config?: DefinitionConfig;
}
