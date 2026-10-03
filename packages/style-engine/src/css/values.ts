import {
  componentTokenPublicPath,
  globalRefInComponentTokenDefault,
  isFontFamilyRef,
} from '@facadeur/core';
import {
  fontCustomProperty,
  tokenCustomProperty,
  typographyCustomProperty,
} from '@facadeur/tokens';
import { toKebab } from './declarations';
import type { SubstituteContext } from './types';

const TYPOGRAPHY_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
] as const;

const SINGLE_REF = /^\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}$/;

function componentTokenFallback(value: string): string {
  const globalRef = globalRefInComponentTokenDefault(value);
  if (globalRef) return `var(${tokenCustomProperty(globalRef)})`;
  return value;
}

/** Replace `{token.path}` and `{font.id}` with `var(--…)`. */
export function substituteRefs(value: string, context?: SubstituteContext): string {
  return value.replace(/\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}/g, (_match, path: string) => {
    if (isFontFamilyRef(path)) {
      const id = path.split('.')[1];
      return `var(${fontCustomProperty(id ?? path)})`;
    }
    if (context?.componentTokens?.[path]) {
      const publicPath = componentTokenPublicPath(context.documentId, path);
      const fallback = componentTokenFallback(context.componentTokens[path].value);
      return `var(${tokenCustomProperty(publicPath)}, ${fallback})`;
    }
    return `var(${tokenCustomProperty(path)})`;
  });
}

/**
 * `font: "{type.body}"` becomes the typography longhands. Any other property
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
    if (toKebab(property) === 'font' && ref && !isFontFamilyRef(ref)) {
      for (const field of TYPOGRAPHY_FIELDS) {
        out.push([toKebab(field), `var(${typographyCustomProperty(ref, field)})`]);
      }
      continue;
    }
    out.push([toKebab(property), substituteRefs(value, context)]);
  }
  return out;
}
