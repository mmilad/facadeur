/** Author-facing label for one path segment. The stored id stays the dotted path. */
export function tokenSegmentLabel(segment: string): string {
  if (!segment) return segment;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** The token's own name: the last segment, not the groups it sits in. */
export function tokenLeafLabel(path: string): string {
  const leaf = path.split('.').at(-1) ?? path;
  return tokenSegmentLabel(leaf);
}

/** Spaced label for a group path or a full path shown without a group header. */
export function tokenTitle(path: string): string {
  return path
    .split('.')
    .filter((segment) => segment.length > 0)
    .map(tokenSegmentLabel)
    .join(' ');
}
