/** One path segment. Digits are allowed (`500`); hyphens are not, so CSS names stay unique. */
export const TOKEN_SEGMENT = /^[a-z0-9]+$/;

const REFERENCE = /^\{([a-z0-9]+(?:\.[a-z0-9]+)*)\}$/;
/** Whole-string DTCG reference `{group.token}`, or undefined. */
export function tokenReference(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return REFERENCE.exec(value)?.[1];
}
