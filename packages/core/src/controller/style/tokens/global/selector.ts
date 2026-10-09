/** Generate a CSS custom-property name from the token's derived family/group/label path. */
export function tokenCssPropertyName(path: string): string {
  const parts = path
    .split('.')
    .map((part) =>
      part
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean);
  return `--${parts.join('-')}`;
}
