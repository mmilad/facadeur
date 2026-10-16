import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  readTokenTree,
  tokenReference,
  tokenReferenceValue,
  type Breakpoint,
} from '@facadeur/core';
import { createTokenPreviewResolver } from '@facadeur/style-engine';
import { tokenDisplayLabel, tokenPath } from './token-presentation';
import { formatTokenValue } from '../../../domain/edits/token-edit';
import type { EditorDesignSnapshot } from '../../../domain/session';

const TokenPreviewContext = createContext<(reference: string) => string | undefined>(
  () => undefined,
);
const TokenLabelContext = createContext<(reference: string) => string>(tokenDisplayLabel);
const TokenSearchValueContext = createContext<(reference: string) => string | undefined>(
  () => undefined,
);

/** Preview uses the same token compiler as the canvas; global refs stay UUID-based. */
export function TokenPreviewProvider({
  design,
  breakpointId,
  children,
  declarations,
  breakpoints,
}: {
  design: EditorDesignSnapshot;
  breakpointId: string | null;
  children: ReactNode;
  /** Effective custom properties at the selected element, including local instance rules. */
  declarations?: Readonly<Record<string, string>>;
  /** Optional editor preview breakpoints; storage remains owned by the design. */
  breakpoints?: Breakpoint[];
}) {
  const { searchValue, labelFor } = useMemo(() => {
    const values = new Map<string, string>();
    for (const token of readTokenTree(design.tokens).tokens.values()) {
      const value = token.breakpoints[breakpointId ?? ''] ?? token.value;
      const searchValue = fontSearchValue(token.family, token.valueType, value);
      values.set(tokenReferenceValue(token.uuid), searchValue ?? formatTokenValue(value));
    }
    return {
      searchValue: (reference: string) => values.get(normalizeReference(reference)),
      labelFor: createTokenLabeler(design),
    };
  }, [design.tokens, breakpointId]);

  const resolve = useMemo(() => {
    try {
      return createTokenPreviewResolver({
        tokens: design.tokens,
        breakpoints: breakpoints ?? design.breakpoints,
        breakpointId,
        declarations,
      });
    } catch {
      // An incomplete design must not prevent editing or discard unknown references.
      return () => undefined;
    }
  }, [design.tokens, design.breakpoints, breakpointId, declarations, breakpoints]);

  return (
    <TokenSearchValueContext.Provider value={searchValue}>
      <TokenLabelContext.Provider value={labelFor}>
        <TokenPreviewContext.Provider value={resolve}>{children}</TokenPreviewContext.Provider>
      </TokenLabelContext.Provider>
    </TokenSearchValueContext.Provider>
  );
}

export function useTokenPreview(reference: string) {
  return useTokenResolver()(reference);
}

/** Resolve several preview fields without calling hooks inside loops or callbacks. */
export function useTokenResolver() {
  return useContext(TokenPreviewContext);
}

export function useTokenLabel() {
  return useContext(TokenLabelContext);
}

/** Current value labels may follow the document that owns an inherited value. */
function createTokenLabeler(design: EditorDesignSnapshot): (reference: string) => string {
  const designLabels = new Map<string, { family: string; path: string; label: string }>();
  for (const token of readTokenTree(design.tokens).tokens.values()) {
    designLabels.set(tokenReferenceValue(token.uuid), {
      family: token.family,
      path: token.path,
      label: token.label,
    });
  }
  return (reference: string) => {
    const key = normalizeReference(reference);
    const token = designLabels.get(key);
    if (token?.family === 'font') return token.label;
    if (token) return tokenDisplayLabel(token.path, token.label);
    return tokenDisplayLabel(key);
  };
}

function fontSearchValue(family: string, valueType: string, value: unknown) {
  if (
    family !== 'font' ||
    valueType !== 'fontFamily' ||
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  const font = value as Record<string, unknown>;
  if (typeof font.family !== 'string' || !Array.isArray(font.fallbacks)) return undefined;
  const fallbacks = font.fallbacks.filter(
    (fallback): fallback is string => typeof fallback === 'string',
  );
  return [font.family, ...fallbacks].join(', ');
}

function normalizeReference(reference: string) {
  const value = reference.trim();
  const uuid = tokenReference(value);
  if (uuid) return tokenReferenceValue(uuid);
  const path = tokenPath(value);
  return `{${path}}`;
}

export function useTokenSearchValue() {
  return useContext(TokenSearchValueContext);
}
