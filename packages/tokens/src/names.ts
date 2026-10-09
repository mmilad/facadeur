/**
 * CSS custom property names.
 *
 * - A token's derived family/group/label path becomes its CSS custom property.
 * - A UUID reference is resolved to that generated property name.
 * - A typography token expands to one property per field, with a double hyphen
 *   before the field: `--type-body--font-size`.
 * - A typography token expands to one property per field, with a double hyphen
 *   before the field: `--type-body--font-size`. The double hyphen cannot appear
 *   in a token path, so the field does not collide with another token.
 * - A shadow token is one property whose value is a `box-shadow` list.
 * - The breakpoint with the smallest min-width is the base value on `:root`.
 *   It does not get a media query. Each larger breakpoint emits
 *   `@media (min-width: <px>) { :root { ... } }` with only the properties that change.
 */
import { tokenCssPropertyName } from '@facadeur/core';

/** `color.blue.500` (derived from family/group/label) → `--color-blue-500`. */
export function tokenCustomProperty(path: string): string {
  return tokenCssPropertyName(path);
}

/** Typography field on `type.body` → `--type-body--font-size`. */
export function typographyCustomProperty(path: string, field: string): string {
  const kebab = field.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `${tokenCustomProperty(path)}--${kebab}`;
}
