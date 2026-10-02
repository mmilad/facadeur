import { describe, expect, it } from 'vitest';
import {
  pathFromComponentTokenLabel,
  pathFromDesignTokenLabel,
  previewComponentTokenCssVar,
  previewDesignTokenCssVar,
} from '../src/domain/component-tokens.js';

describe('component token path generation', () => {
  it('derives color paths from labels', () => {
    const existing = new Set<string>();
    expect(pathFromComponentTokenLabel('Border', 'color', existing)).toBe('color.border');
    expect(pathFromComponentTokenLabel('font color', 'color', existing)).toBe('color.font');
  });

  it('dedupes against existing local paths', () => {
    const existing = new Set(['color.border']);
    expect(pathFromComponentTokenLabel('Border', 'color', existing)).toBe('color.border2');
  });

  it('previews css vars with the project prefix', () => {
    expect(previewComponentTokenCssVar('input', 'color.font')).toBe('--fcdr-input-color-font');
    expect(previewDesignTokenCssVar('color.neutral.100')).toBe('--fcdr-color-neutral-100');
  });

  it('derives global design token paths from labels', () => {
    expect(pathFromDesignTokenLabel('Neutral 100', 'color', new Set())).toBe('color.neutral.100');
  });
});
