/** Escape a value inside a quoted CSS string/attribute; not a selector identifier. */
export function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
