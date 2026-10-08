import type { ChildFieldOverrides } from '../schema/document';

/** Merge sparse variant overrides by path and field, with the source winning. */
export function mergeChildFieldOverrides(
  target: ChildFieldOverrides | undefined,
  source: ChildFieldOverrides,
): ChildFieldOverrides {
  const next = structuredClone(target ?? {});
  for (const [path, fields] of Object.entries(source)) {
    next[path] = { ...(next[path] ?? {}), ...structuredClone(fields) };
  }
  return next;
}

/** Carry nested overrides into a composed instance while keeping outer edits authoritative. */
export function mergeChildFieldContext(
  inherited: ChildFieldOverrides | undefined,
  own: ChildFieldOverrides | undefined,
  prefix: string | null,
): ChildFieldOverrides | undefined {
  if (!inherited && !own) return undefined;
  const next: ChildFieldOverrides = {};
  for (const [path, fields] of Object.entries(own ?? {})) {
    const fullPath = prefix ? `${prefix}/${path}` : path;
    next[fullPath] = structuredClone(fields);
  }
  for (const [path, fields] of Object.entries(inherited ?? {})) {
    next[path] = { ...(next[path] ?? {}), ...structuredClone(fields) };
  }
  return next;
}

/** Return the sparse override path for a child instance, omitting component roots. */
export function childOverridePath(parent: string | null | undefined, id: string): string | null {
  if (parent === null || parent === undefined) return null;
  return parent ? `${parent}/${id}` : id;
}
