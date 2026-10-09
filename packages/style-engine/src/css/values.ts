import {
  componentTokenPublicPath,
  globalRefInComponentTokenDefault,
  readTokenTree,
  tokenReference,
  type DesignTokenSet,
} from '@facadeur/core';
import { tokenCustomProperty, typographyCustomProperty } from '@facadeur/tokens';
import { toKebab } from './declarations';
import type { SubstituteContext } from './types';

const TYPOGRAPHY_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const;

const SINGLE_REF = /^\{token:([0-9a-f-]{36})\}$/i;

export function globalTokenSubstitutions(tokens: DesignTokenSet | undefined) {
  if (!tokens) return {};
  const index = readTokenTree(tokens);
  const properties: Record<string, string> = {};
  const types: Record<string, import('@facadeur/core').DesignTokenValueType> = {};
  const paths: Record<string, string> = {};
  for (const token of index.tokens.values()) {
    properties[token.uuid] = tokenCustomProperty(token.path);
    types[token.uuid] = token.valueType;
    paths[token.uuid] = token.path;
  }
  return { globalTokenProperties: properties, globalTokenTypes: types, globalTokenPaths: paths };
}

function componentTokenFallback(value: string, context?: SubstituteContext): string {
  const globalRef = globalRefInComponentTokenDefault(value);
  if (globalRef) return `var(${globalTokenProperty(globalRef, context)})`;
  return value;
}

/** Replace UUID-keyed global token and local component token references with `var(--…)`. */
export function substituteRefs(value: string, context?: SubstituteContext): string {
  return value.replace(/\{([^{}]+)\}/g, (match, reference: string) => {
    const globalUuid = tokenReference(`{${reference}}`);
    if (globalUuid) return `var(${globalTokenProperty(globalUuid, context)})`;
    const path = reference;
    if (context?.componentTokens?.[path]) {
      const publicPath = componentTokenPublicPath(context.documentId, path);
      const fallback = componentTokenFallback(context.componentTokens[path].value, context);
      return `var(${tokenCustomProperty(publicPath)}, ${fallback})`;
    }
    return match;
  });
}

/**
 * A `font: "{token:uuid}"` reference to typography becomes its longhands. Any other property
 * keeps its name and substitutes token references inside the value.
 * Later declarations in the same list override earlier ones when merged.
 */
export function expandDeclarations(
  declarations: Record<string, string> | undefined,
  context?: SubstituteContext,
): [string, string][] {
  if (!declarations) return [];
  const out: [string, string][] = [];
  for (const [property, value] of Object.entries(declarations)) {
    const ref = value.match(SINGLE_REF)?.[1];
    const uuid = ref ? tokenReference(value) : undefined;
    const type = uuid ? context?.globalTokenTypes?.[uuid] : undefined;
    if (toKebab(property) === 'font' && uuid && type === 'typography') {
      const tokenPath = context?.globalTokenPaths?.[uuid] ?? `token-${uuid}`;
      for (const field of TYPOGRAPHY_FIELDS) {
        out.push([toKebab(field), `var(${typographyCustomProperty(tokenPath, field)})`]);
      }
      continue;
    }
    out.push([toKebab(property), substituteRefs(value, context)]);
  }
  return out;
}

function globalTokenProperty(uuid: string, context?: SubstituteContext) {
  return context?.globalTokenProperties?.[uuid] ?? `--token-${uuid}`;
}
