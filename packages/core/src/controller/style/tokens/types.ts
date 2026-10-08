import type { JsonValue } from '../../../utils';
import type { TokenType } from '../../../schema/document';

export type TokenTier = 'primitive' | 'semantic' | 'component';

/** DTCG tree as stored on the document. Object keys are sorted when canonicalized. */
export type TokenTree = Record<string, JsonValue>;

export interface TokenDefinition {
  $value: JsonValue;
  $type?: TokenType;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, JsonValue>;
}

export interface TokenGroupDefinition {
  $type?: TokenType;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, JsonValue>;
}

export interface IndexedToken {
  path: string;
  label?: string;
  type: TokenType;
  tier?: TokenTier;
  value: JsonValue;
  description?: string;
  deprecated?: boolean | string;
  breakpoints: Record<string, JsonValue>;
}

export interface IndexedGroup {
  path: string;
  type?: TokenType;
  tier?: TokenTier;
  description?: string;
}

export interface TokenIndex {
  tokens: Map<string, IndexedToken>;
  groups: Map<string, IndexedGroup>;
}
