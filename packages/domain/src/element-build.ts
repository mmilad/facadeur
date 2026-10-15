import type { Uuid } from './uuid';

/** Declarative DOM tree for renderers — no document APIs in domain. */
export interface ElementBuildConfig {
  readonly tagName: string;
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly dataset?: Readonly<Record<string, string>>;
  /** Resolved component prop bindings used by runtime style rules. */
  readonly dynamicStyle?: Readonly<Record<string, string>>;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly ElementBuildConfig[];
  /** Catalog nodes whose styles apply to this rendered root, including referenced definition roots. */
  readonly styleNodeUuids?: readonly Uuid[];
  readonly nodeUuid?: Uuid;
}
