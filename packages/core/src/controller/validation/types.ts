import type { NestingRule } from '../../document/kinds';
import type { FlatDocument } from '../../document/flat';
import type { DocumentFile, FieldDefinition, SchemaCatalog } from '../../schema/document';

export type ContractDocument = DocumentFile | FlatDocument;
export type ContractCatalog = ReadonlyMap<string, ContractDocument>;

export interface SchemaResolverContext {
  documents: ContractCatalog;
  schemaCatalog?: SchemaCatalog;
}

export type ContractResolverInput = ContractCatalog | SchemaResolverContext;

export interface AutomaticFieldGroup {
  instanceId: string;
  componentId: string;
  componentName: string;
  enabled: boolean;
  fields: FieldDefinition[];
}

export interface ValidateOptions {
  rules?: Readonly<Record<string, NestingRule>>;
  /** When set, instance targets must resolve to a kind allowed by the nesting rule. */
  resolveKind?: (componentId: string) => string | undefined;
  /** Stable global token UUIDs; validates component token defaults when set. */
  globalTokenUuids?: ReadonlySet<string>;
  /** Resolve local tokens for path-keyed component targets; global set targets are UUIDs. */
  resolveComponentTokenPaths?: (documentId: string) => ReadonlySet<string> | undefined;
  /** When available, verifies nested style paths against rendered local instance roots. */
  resolveNestedStyleTarget?: (documentId: string, path: readonly string[]) => boolean | undefined;
}
