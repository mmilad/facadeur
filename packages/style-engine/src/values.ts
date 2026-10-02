import {
  componentTokenPublicPath,
  globalRefInComponentTokenDefault,
  isFontFamilyRef,
  type ComponentToken,
} from '@facadeur/core';
import {
  fontCustomProperty,
  tokenCustomProperty,
  typographyCustomProperty,
} from '@facadeur/tokens';
import { toKebab } from './controller.js';

export type ComponentTokenSubstitute = Pick<ComponentToken, 'type' | 'value'>;

export interface SubstituteContext {
  documentId: string;
  /** Local defaults keyed by token path (path is not repeated on each entry). */
  componentTokens?: Record<string, ComponentTokenSubstitute>;
}

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

export function mergeDeclarations(
  groups: readonly (readonly [string, string][])[],
): [string, string][] {
  const values = new Map<string, string>();
  const order: string[] = [];
  for (const group of groups) {
    for (const [name, value] of group) {
      if (!values.has(name)) order.push(name);
      values.set(name, value);
    }
  }
  return order.flatMap((name) => {
    const value = values.get(name);
    return value === undefined ? [] : [[name, value] as [string, string]];
  });
}
