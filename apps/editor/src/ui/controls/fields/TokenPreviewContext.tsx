import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  readTokenTree,
  tokenReference,
  tokenReferenceValue,
  type Breakpoint,
} from '@facadeur/core';
import { loadTokens, tokenCustomProperty } from '@facadeur/core';
import { tokenDisplayLabel, tokenPath } from '../token-presentation';
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
      values.set(
        tokenReferenceValue(token.uuid),
        formatTokenValue(token.breakpoints[breakpointId ?? ''] ?? token.value),
      );
    }
    return {
      searchValue: (reference: string) => values.get(normalizeReference(reference)),
      labelFor: createTokenLabeler(design),
    };
  }, [design.tokens, breakpointId]);

  const resolve = useMemo(() => {
    try {
      const compiled = loadTokens({
        tokens: design.tokens,
        breakpoints: breakpoints ?? design.breakpoints,
      });
      const index = readTokenTree(design.tokens);
      const properties = new Map<string, string>();
      const propertyByUuid = new Map(
        [...index.tokens.values()].map((token) => [token.uuid, tokenCustomProperty(token.path)]),
      );
      const targetWidth = compiled.breakpoints.find((item) => item.uuid === breakpointId)?.minWidth;
      for (const property of compiled.properties) {
        let value = property.value;
        if (targetWidth !== undefined) {
          for (const breakpoint of compiled.breakpoints) {
            if (breakpoint.minWidth > targetWidth) continue;
            value = property.breakpoints[breakpoint.uuid] ?? value;
          }
        }
        properties.set(property.name, value);
      }

      const customProperty = (reference: string) => {
        const uuid = tokenReference(`{${reference}}`);
        return (uuid && propertyByUuid.get(uuid)) || tokenCustomProperty(reference);
      };
      const replaceReferences = (value: string) =>
        value.replace(
          /\{([^{}]+)\}/g,
          (_, reference: string) => `var(${customProperty(reference)})`,
        );

      for (const [name, value] of Object.entries(declarations ?? {})) {
        if (!name.startsWith('--')) continue;
        properties.set(name, replaceReferences(value));
      }

      function expand(value: string, seen: Set<string>): string | undefined {
        let missing = false;
        const result = value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
          const nested = properties.get(name);
          if (nested === undefined || seen.has(name)) {
            missing = true;
            return '';
          }
          const resolved = expand(nested, new Set([...seen, name]));
          if (resolved === undefined) missing = true;
          return resolved ?? '';
        });
        return missing ? undefined : result;
      }

      return (reference: string) => {
        const value = reference.trim();
        const uuid = tokenReference(value);
        const key = uuid ? propertyByUuid.get(uuid) : tokenCustomProperty(tokenPath(value));
        if (!key) return undefined;
        const resolved = properties.get(key);
        return resolved ? expand(resolved, new Set([key])) : undefined;
      };
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
  const designLabels = new Map<string, { path: string; label: string }>();
  for (const token of readTokenTree(design.tokens).tokens.values()) {
    designLabels.set(tokenReferenceValue(token.uuid), { path: token.path, label: token.label });
  }
  return (reference: string) => {
    const key = normalizeReference(reference);
    const token = designLabels.get(key);
    if (token) return tokenDisplayLabel(token.path, token.label);
    return tokenDisplayLabel(key);
  };
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
