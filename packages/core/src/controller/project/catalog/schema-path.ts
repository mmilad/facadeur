export function schemaPathExists(schema: Record<string, unknown> | null, path: string) {
  let current: unknown = schema;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return false;
    const properties = (current as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object' || !(segment in properties)) return false;
    current = (properties as Record<string, unknown>)[segment];
  }
  return true;
}
