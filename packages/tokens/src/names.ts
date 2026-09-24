/**
 * CSS custom property names.
 *
 * - A token path `color.blue.500` becomes `--color-blue-500`.
 *   Segments match `[a-z0-9]+` and are joined with a single hyphen, so each
 *   path has one name and two paths never share a name.
 * - A reference `{color.blue.500}` becomes `var(--color-blue-500)`.
 * - A font id `sans` becomes `--font-sans`. Type tokens refer to it as `{font.sans}`.
 * - A typography token expands to one property per field, with a double hyphen
 *   before the field: `--type-body--font-size`. The double hyphen cannot appear
 *   in a token path, so the field does not collide with another token.
 * - A shadow token is one property whose value is a `box-shadow` list.
 * - The breakpoint with the smallest min-width is the base value on `:root`.
 *   It does not get a media query. Each larger breakpoint emits
 *   `@media (min-width: <px>) { :root { ... } }` with only the properties that change.
 */

/** `color.blue.500` → `--color-blue-500`. */
export function tokenCustomProperty(path: string): string {
  return `--${path.split('.').join('-')}`;
}

/** Font id `sans` → `--font-sans`. */
export function fontCustomProperty(id: string): string {
  return `--font-${id}`;
}

/** Typography field on `type.body` → `--type-body--font-size`. */
export function typographyCustomProperty(path: string, field: string): string {
  const kebab = field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `${tokenCustomProperty(path)}--${kebab}`;
}
