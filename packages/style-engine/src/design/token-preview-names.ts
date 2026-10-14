export const DESIGN_TOKEN_CSS_PREFIX = 'fcdr';

/**
 * TODO: consolidate with Core tokenCustomProperty after agreeing on preview label/search behavior.
 * The retained --fcdr- convention differs from compiled properties; see docs/plan.md.
 */

/** CSS variable preview for global design tokens on the Settings page. */
export function previewDesignTokenCssVar(path: string): string {
  return `--${DESIGN_TOKEN_CSS_PREFIX}-${path.split('.').join('-')}`;
}
