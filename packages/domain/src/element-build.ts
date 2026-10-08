import type { Uuid } from './uuid';

/** Declarative DOM tree for renderers — no document APIs in domain. */
export interface ElementBuildConfig {
  readonly tagName: string;
  readonly text?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly dataset?: Readonly<Record<string, string>>;
  readonly style?: Readonly<Record<string, string>>;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly ElementBuildConfig[];
  readonly nodeUuid?: Uuid;
}
