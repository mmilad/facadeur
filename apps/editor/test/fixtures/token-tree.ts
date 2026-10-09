import { readTokenTree } from '@facadeur/core';

/** Test lookup by the generated display path; persisted token identity remains its UUID. */
export function tokenAtPath(tree: unknown, path: string) {
  return [...readTokenTree(tree).tokens.values()].find((token) => token.path === path);
}
