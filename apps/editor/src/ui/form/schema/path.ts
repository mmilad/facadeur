/**
 * Path segments use dot notation; array indices are numeric segments.
 * Record keys containing dots must be bracket-quoted: `declarations["padding.top"]`.
 */

const PATH_TOKEN_RE = /[^.[\]]+|\["((?:\\.|[^"\\])*)"\]/g;

export function parsePath(path: string): string[] {
  if (!path) return [];
  const segments: string[] = [];
  for (const match of path.matchAll(PATH_TOKEN_RE)) {
    if (match[1] !== undefined) segments.push(match[1].replace(/\\"/g, '"'));
    else if (match[0]) segments.push(match[0]);
  }
  return segments;
}

export function joinPath(...segments: (string | number)[]): string {
  return segments
    .map((segment, index) => {
      const key = String(segment);
      if (/^\d+$/.test(key)) return key;
      if (key.includes('.') || key.includes('[') || key.includes(']')) {
        return index === 0 ? formatKey(key) : formatKey(key);
      }
      return key;
    })
    .reduce((acc, segment, index) => {
      if (index === 0) return segment;
      if (segment.startsWith('[')) return `${acc}${segment}`;
      return `${acc}.${segment}`;
    }, '');
}

export function formatKey(key: string): string {
  if (/^\d+$/.test(key)) return key;
  if (key.includes('.') || key.includes('[') || key.includes(']')) {
    return `["${key.replace(/"/g, '\\"')}"]`;
  }
  return key;
}

export function getPath(root: unknown, path: string): unknown {
  const segments = parsePath(path);
  let current: unknown = root;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function setPath<T>(root: T, path: string, value: unknown): T {
  const segments = parsePath(path);
  if (segments.length === 0) return value as T;

  function setAt(current: unknown, index: number): unknown {
    const key = segments[index]!;
    if (index === segments.length - 1) {
      if (Array.isArray(current)) {
        const copy = [...current];
        copy[Number(key)] = value;
        return copy;
      }
      return { ...(current as Record<string, unknown>), [key]: value };
    }

    const existing =
      current === null || current === undefined
        ? undefined
        : Array.isArray(current)
          ? current[Number(key)]
          : (current as Record<string, unknown>)[key];

    const nextKey = segments[index + 1]!;
    const childDefault = /^\d+$/.test(nextKey) ? [] : {};
    const nextChild = setAt(existing ?? childDefault, index + 1);

    if (Array.isArray(current)) {
      const copy = [...current];
      copy[Number(key)] = nextChild;
      return copy;
    }
    const base =
      current !== null && typeof current === 'object'
        ? { ...(current as Record<string, unknown>) }
        : {};
    base[key] = nextChild;
    return base;
  }

  return setAt(root, 0) as T;
}

export function resolvePath(prefix: string, name: string): string {
  if (!prefix) return name;
  if (!name) return prefix;
  if (name.startsWith('[')) return `${prefix}${name}`;
  return `${prefix}.${name}`;
}
