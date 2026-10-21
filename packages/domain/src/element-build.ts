import type { Uuid } from './uuid';
import type { FieldValue } from './field-value';
import type { CompositionSource, RepeaterFilter } from './node';

/** Declarative DOM tree for renderers — no document APIs in domain. */
export interface ElementBuildConfig {
  readonly kind?: never;
  readonly tagName: string;
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly dataset?: Readonly<Record<string, string>>;
  /** Resolved component prop bindings used by runtime style rules. */
  readonly dynamicStyle?: Readonly<Record<string, string>>;
  readonly dynamicClassStyles?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly RenderBuildConfig[];
  /** Catalog nodes whose styles apply to this rendered root, including referenced definition roots. */
  readonly styleNodeUuids?: readonly Uuid[];
  readonly nodeUuid?: Uuid;
  /** Stable key for repeated instances of one authored node. */
  readonly renderKey?: string;
  /** Stable rendered path used by editor-only behavior and control state. */
  readonly instanceKey?: string;
  /** Component behavior targets attached to this rendered element. */
  readonly behaviorTargets?: readonly ElementBehaviorTarget[];
}

/** Identifies the definition instance and authored node that own an interaction. */
export interface ElementBehaviorTarget {
  readonly scopeKey: string;
  readonly definitionUuid: Uuid;
  readonly nodeUuid: Uuid;
  readonly events: readonly string[];
  readonly props?: Readonly<Record<string, FieldValue>>;
  readonly repeaterIndices?: Readonly<Record<string, number>>;
}

/** A structural Catalog node that contributes its children without a DOM element. */
export interface FragmentBuildConfig {
  readonly kind: 'fragment';
  readonly tagName?: never;
  readonly text?: never;
  readonly attributes?: never;
  readonly children?: readonly RenderBuildConfig[];
  readonly nodeUuid?: Uuid;
  /** Stable key for repeated instances of one authored node. */
  readonly renderKey?: string;
  /** Runtime array mapping for a dynamic repeater, including empty-list templates. */
  readonly repeater?: {
    readonly source: CompositionSource;
    readonly itemSchema: Readonly<Record<string, unknown>>;
    readonly templates: readonly RenderBuildConfig[];
    readonly indexName: string;
    readonly keyPath?: string;
    readonly filter?: RepeaterFilter;
  };
}

export type RenderBuildConfig = ElementBuildConfig | FragmentBuildConfig;
