import type { Uuid } from './uuid';

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
}

export type RenderBuildConfig = ElementBuildConfig | FragmentBuildConfig;
