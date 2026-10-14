import {
  loadTokens,
  readTokenTree,
  tokenCustomProperty,
  tokenReference,
  type DesignInput,
} from '@facadeur/core';

export interface TokenPreviewInput extends DesignInput {
  breakpointId: string | null;
  /** Effective custom properties at the selected element, including local instance rules. */
  declarations?: Readonly<Record<string, string>>;
}

/** Resolve a token's effective custom-property value for an editor preview. */
export function createTokenPreviewResolver({
  tokens,
  breakpoints,
  breakpointId,
  declarations,
}: TokenPreviewInput) {
  const compiled = loadTokens({ tokens, breakpoints });
  const index = readTokenTree(tokens ?? {});
  const propertyByUuid = new Map(
    [...index.tokens.values()].map((token) => [token.uuid, tokenCustomProperty(token.path)]),
  );
  const properties = new Map<string, string>();
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
    value.replace(/\{([^{}]+)\}/g, (_, reference: string) => `var(${customProperty(reference)})`);

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
    const path = /^\{[^{}]+\}$/.test(value) ? value.slice(1, -1) : value;
    const key = uuid ? propertyByUuid.get(uuid) : tokenCustomProperty(path);
    if (!key) return undefined;
    const resolved = properties.get(key);
    return resolved ? expand(resolved, new Set([key])) : undefined;
  };
}
