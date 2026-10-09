import type { ComponentToken, DesignTokenValueType } from '@facadeur/core';

export type ComponentTokenSubstitute = Pick<ComponentToken, 'type' | 'value'>;

export interface SubstituteContext {
  documentId: string;
  /** Local defaults keyed by token path (path is not repeated on each entry). */
  componentTokens?: Record<string, ComponentTokenSubstitute>;
  /** Generated CSS property names and types, indexed by stable global token UUID. */
  globalTokenProperties?: Readonly<Record<string, string>>;
  globalTokenTypes?: Readonly<Record<string, DesignTokenValueType>>;
  globalTokenPaths?: Readonly<Record<string, string>>;
}
