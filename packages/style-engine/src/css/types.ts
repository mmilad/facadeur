import type { ComponentToken } from '@facadeur/core';

export type ComponentTokenSubstitute = Pick<ComponentToken, 'type' | 'value'>;

export interface SubstituteContext {
  documentId: string;
  /** Local defaults keyed by token path (path is not repeated on each entry). */
  componentTokens?: Record<string, ComponentTokenSubstitute>;
}
