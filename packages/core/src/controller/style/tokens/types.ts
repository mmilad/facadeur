import type {
  DesignTokenFamily,
  DesignTokenRecord,
  DesignTokenSet,
  DesignTokenUuid,
  DesignTokenValue,
  DesignTokenValueType,
} from '@facadeur/domain';

export type TokenTier = 'primitive' | 'semantic' | 'component';
export type TokenType = DesignTokenValueType;
export type TokenTree = DesignTokenSet;
export type TokenDefinition = DesignTokenRecord;
export type IdentifiedTokenDefinition = DesignTokenRecord;

export interface IndexedToken extends DesignTokenRecord {
  readonly family: DesignTokenFamily;
  /** Derived display path; never used as a persisted identity or reference. */
  readonly path: string;
  readonly type: TokenType;
  readonly tier?: TokenTier;
  readonly breakpoints: Record<DesignTokenUuid, DesignTokenValue>;
}

export interface IndexedGroup {
  readonly family: DesignTokenFamily;
  readonly group: string;
  readonly path: string;
  readonly tier?: TokenTier;
}

export interface TokenIndex {
  readonly tokens: Map<DesignTokenUuid, IndexedToken>;
  readonly groups: Map<string, IndexedGroup>;
}
