import { describe, expect, it } from 'vitest';
import { previewDesignTokenCssVar } from '../src/domain/design-token-css';

describe('design token CSS variables', () => {
  it('uses the project prefix and replaces path separators with hyphens', () => {
    expect(previewDesignTokenCssVar('color.neutral.100')).toBe('--fcdr-color-neutral-100');
  });
});
