import type { DomSpec } from './dom';
import type { FieldValue } from './field-value';
import type { SchemaSource } from './schema-source';
import type { LayerMap, StyleLayer, VariantStyleMap } from './design-system';
import type { Uuid } from './uuid';

export interface PreviewData {
  readonly fields?: Readonly<Record<string, FieldValue>>;
}

export interface NodeConfig {
  readonly definitionRef?: Uuid;
  /** Resolve a component definition UUID from the active repeater item. */
  readonly definitionRefBinding?: { readonly kind: 'item'; readonly path: string };
  /** Data-driven composition for this node, or a case value when nested in a switch. */
  readonly composition?:
    | {
        readonly kind: 'repeater';
        readonly source?: CompositionSource;
        /** Optional display name for this repeater's current item index. */
        readonly indexName?: string;
      }
    | {
        readonly kind: 'switch';
        readonly source?: CompositionSource;
      }
    | { readonly kind: 'slot' };
  readonly compositionCase?: string;
  readonly previewData?: PreviewData;
}

export type CompositionSource =
  { readonly kind: 'prop'; readonly uuid: Uuid } | { readonly kind: 'item'; readonly path: string };

export type FieldExposure =
  | { readonly mode: 'flat' }
  | { readonly mode: 'grouped'; readonly groupName?: string }
  | { readonly mode: 'manual'; readonly fields: Readonly<Record<string, string>> };

export interface StaticFieldConfig {
  readonly isStatic: true;
  readonly value?: FieldValue;
  /** Static fields are private to the definition unless explicitly exposed. */
  readonly expose?: boolean;
}

export interface DefinitionConfig {
  readonly previewData?: PreviewData;
  /** Per-instance field exposure, keyed by the embedding node UUID in this definition. */
  readonly fieldExposure?: Readonly<Record<Uuid, FieldExposure>>;
  /** Definition-owned static values, keyed by top-level schema field name. */
  readonly staticFields?: Readonly<Record<string, StaticFieldConfig>>;
  /** Static/exposed field settings for referenced components, keyed by embedding node UUID. */
  readonly instanceFieldConfigs?: Readonly<
    Record<Uuid, Readonly<Record<string, StaticFieldConfig>>>
  >;
}

export interface Node {
  readonly uuid: Uuid;
  /** Editor-facing label for this authored element, independent of its HTML tag. */
  readonly name?: string;
  readonly dom: DomSpec & { readonly children?: readonly Node[] };
  /** Literal CSS classes owned by this element; the `class` DOM attribute is derived. */
  readonly classes?: readonly NodeClassDefinition[];
  readonly schema?: SchemaSource;
  readonly data?: Readonly<Record<string, FieldValue>>;
  readonly config?: NodeConfig;
}

export interface NodeClassDefinition {
  readonly name: string;
  /** Present only for the class derived from this layer's editor-facing name. */
  readonly generated?: true;
  readonly condition?: {
    readonly kind: 'prop-equals';
    readonly propUuid: Uuid;
    readonly value: string | number | boolean | null;
  };
  readonly style?: StyleLayer & {
    readonly variants?: VariantStyleMap;
    readonly breakpoints?: LayerMap;
  };
}

export type NodeDefinitionKind = 'atom' | 'component' | 'page';

export interface NodeDefinition {
  readonly uuid: Uuid;
  readonly name: string;
  readonly kind: NodeDefinitionKind;
  readonly category?: string;
  readonly schema: SchemaSource;
  readonly root: Node;
  readonly config?: DefinitionConfig;
}

export type NodeDefinitionModel = NodeDefinition;
