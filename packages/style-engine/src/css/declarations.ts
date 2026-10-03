export function toKebab(property: string): string {
  if (property.startsWith('--')) return property;
  return property.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (letters, offset) => {
    return (offset ? '-' : '') + letters.toLowerCase();
  });
}

export function mergeDeclarations(
  groups: readonly (readonly [string, string][])[],
): [string, string][] {
  const values = new Map<string, string>();
  for (const group of groups) {
    for (const [name, value] of group) {
      values.set(name, value);
    }
  }
  return [...values];
}

export function declarationsText(declarations: readonly [string, string][]): string {
  return declarations.map(([name, value]) => `${name}: ${value};`).join(' ');
}
