export const DESIGN_TOKEN_CSS_PREFIX = 'fcdr';

/** CSS variable preview for global design tokens on the Settings page. */
export function previewDesignTokenCssVar(path: string): string {
  return `--${DESIGN_TOKEN_CSS_PREFIX}-${path.split('.').join('-')}`;
}
