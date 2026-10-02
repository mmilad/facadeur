import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { readTokenTree, type Breakpoint, type FlatDocument } from '@facadeur/core';
import { loadTokens, tokenCustomProperty, fontCustomProperty } from '@facadeur/tokens';
import { tokenDisplayLabel, tokenPath } from '../token-presentation.js';
import { formatTokenValue } from '../../../domain/edits/token-edit.js';

const TokenPreviewContext = createContext<(reference: string) => string | undefined>(
  () => undefined,
);
const TokenLabelContext = createContext<(reference: string) => string>(tokenDisplayLabel);
const TokenSearchValueContext = createContext<(reference: string) => string | undefined>(
  () => undefined,
);

/** Preview uses the same token compiler as the canvas; references remain stored verbatim. */
export function TokenPreviewProvider({
  design,
  document,
  breakpointId,
  children,
  declarations,
  breakpoints,
}: {
  design: FlatDocument;
  document: FlatDocument;
  breakpointId: string | null;
  children: ReactNode;
  /** Effective custom properties at the selected element, including local instance rules. */
  declarations?: Readonly<Record<string, string>>;
  /** Optional editor preview breakpoints; storage remains owned by the design. */
  breakpoints?: Breakpoint[];
}) {
  const { searchValue, labelFor } = useMemo(() => {
    const values = new Map<string, string>();
    const labels = new Map<string, string>();
    for (const source of [design.tokens, document.tokens]) {
      for (const token of readTokenTree(source).tokens.values()) {
        if (token.label) labels.set(token.path, token.label);
        values.set(
          token.path,
          formatTokenValue(
            (breakpointId ? token.breakpoints[breakpointId] : undefined) ?? token.value,
          ),
        );
      }
    }
    return {
      searchValue: (reference: string) => values.get(tokenPath(reference)),
      labelFor: (reference: string) =>
        tokenDisplayLabel(reference, labels.get(tokenPath(reference))),
    };
  }, [design.tokens, document.tokens, breakpointId]);
  const resolve = useMemo(() => {
    try {
      const compiled = loadTokens({
        tokens: design.tokens,
        fonts: design.fonts,
        breakpoints: breakpoints ?? design.settings.breakpoints,
      });
      const properties = new Map<string, string>();
      const targetWidth = compiled.breakpoints.find((item) => item.id === breakpointId)?.minWidth;
      for (const property of compiled.properties) {
        let value = property.value;
        if (targetWidth !== undefined) {
          for (const breakpoint of compiled.breakpoints) {
            if (breakpoint.minWidth > targetWidth) continue;
            value = property.breakpoints[breakpoint.id] ?? value;
          }
        }
        properties.set(property.name, value);
      }
      for (const [path, value] of Object.entries(document.tokenInterface?.sets ?? {})) {
        properties.set(
          tokenCustomProperty(path),
          value.replace(/\{([^{}]+)\}/g, (_, ref: string) => `var(${tokenCustomProperty(ref)})`),
        );
      }
      for (const [name, value] of Object.entries(declarations ?? {})) {
        if (!name.startsWith('--')) continue;
        properties.set(
          name,
          value.replace(/\{([^{}]+)\}/g, (_, ref: string) => `var(${tokenCustomProperty(ref)})`),
        );
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
        const match = reference.trim().match(/^\{([^{}]+)\}$/);
        if (!match?.[1]) return undefined;
        const path = match[1];
        const key = path.startsWith('font.')
          ? fontCustomProperty(path.slice(5))
          : tokenCustomProperty(path);
        const value = properties.get(key);
        return value ? expand(value, new Set([key])) : undefined;
      };
    } catch {
      // An incomplete design must not prevent editing or discard unknown references.
      return () => undefined;
    }
  }, [
    design.tokens,
    design.fonts,
    design.settings.breakpoints,
    document.tokenInterface,
    breakpointId,
    declarations,
    breakpoints,
  ]);
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

export function useTokenSearchValue() {
  return useContext(TokenSearchValueContext);
}
