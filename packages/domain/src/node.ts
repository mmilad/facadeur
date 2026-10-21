import type { DomSpec } from './dom';
import type { FieldValue } from './field-value';
import type { SchemaSource } from './schema-source';
import type { JsonSchemaObject } from './schema-source';
import type { LayerMap, StyleLayer, VariantStyleMap } from './design-system';
import type { Uuid } from './uuid';

export type RepeaterFilter = {
  readonly kind: 'contains';
  readonly itemPath: string;
  readonly queryState: string;
};

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
        /** Direct object property used as the stable rendered key for prop/item arrays. */
        readonly keyPath?: string;
        /** Optional display name for this repeater's current item index. */
        readonly indexName?: string;
        /** Optional derived autocomplete filter from an item string field to local string state. */
        readonly filter?: RepeaterFilter;
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
  | { readonly kind: 'prop'; readonly uuid: Uuid }
  | { readonly kind: 'item'; readonly path: string }
  | { readonly kind: 'state'; readonly name: string };

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

export type BehaviorValue =
  | { readonly kind: 'literal'; readonly value: FieldValue | null }
  | { readonly kind: 'state'; readonly name: string }
  | { readonly kind: 'prop'; readonly path: string }
  | { readonly kind: 'event'; readonly path: string }
  | { readonly kind: 'state-after-transition'; readonly name: string }
  | {
      readonly kind: 'operation';
      readonly operator: 'not' | 'add' | 'subtract' | 'equals' | 'toggle';
      readonly values: readonly BehaviorValue[];
    };

export type BehaviorAction =
  | { readonly kind: 'set-state'; readonly name: string; readonly value: BehaviorValue }
  | { readonly kind: 'increment'; readonly name: string; readonly amount?: number }
  | { readonly kind: 'append-array-item'; readonly name: string; readonly repeaterUuid: Uuid }
  | { readonly kind: 'remove-array-item'; readonly name: string; readonly repeaterUuid: Uuid }
  | {
      readonly kind: 'move-array-item';
      readonly name: string;
      readonly repeaterUuid: Uuid;
      readonly direction: 'up' | 'down' | 'before' | 'after';
    }
  | { readonly kind: 'emit'; readonly name: string; readonly args: readonly BehaviorValue[] };

/** Portable, data-only UI behavior. A renderer compiles this contract to its target runtime. */
export interface ComponentBehavior {
  readonly state?: Readonly<Record<string, FieldValue | null>>;
  /** Declares item types independently of preview values, including empty arrays. */
  readonly stateSchema?: Readonly<Record<string, JsonSchemaObject>>;
  /** Direct object property used as the stable React/render key for an array state. */
  readonly stateArrayKeyPaths?: Readonly<Record<string, string>>;
  readonly transitions: readonly {
    readonly nodeUuid: Uuid;
    readonly event: string;
    readonly actions: readonly BehaviorAction[];
  }[];
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
  readonly condition?: ClassCondition | LegacyClassCondition;
  readonly style?: StyleLayer & {
    readonly variants?: VariantStyleMap;
    readonly breakpoints?: LayerMap;
  };
}

export type ClassConditionValue = string | number | boolean | null;
export type ClassConditionOperand =
  | { readonly kind: 'literal'; readonly value: ClassConditionValue }
  | { readonly kind: 'reference'; readonly reference: string };
export type ClassConditionOperator =
  | 'is-set'
  | 'is-not-set'
  | 'equals'
  | 'not-equals'
  | 'greater-than'
  | 'greater-or-equal'
  | 'less-than'
  | 'less-or-equal'
  | 'length-equals'
  | 'length-not-equals'
  | 'length-greater-than'
  | 'length-greater-or-equal'
  | 'length-less-than'
  | 'length-less-or-equal';
export type ClassCondition =
  | {
      readonly kind: 'rule';
      readonly operator: 'and' | 'or';
      readonly conditions: readonly (ClassCondition | ClassConditionLeaf)[];
    }
  | ClassConditionLeaf;
export interface ClassConditionLeaf {
  readonly kind: 'condition';
  readonly left: ClassConditionOperand;
  readonly operator: ClassConditionOperator;
  readonly right?: ClassConditionOperand;
}
/** Read compatibility for catalogs saved before condition groups were introduced. */
export interface LegacyClassCondition {
  readonly kind: 'prop-equals';
  readonly propUuid: Uuid;
  readonly value: ClassConditionValue;
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
  readonly behavior?: ComponentBehavior;
}

export type NodeDefinitionModel = NodeDefinition;
