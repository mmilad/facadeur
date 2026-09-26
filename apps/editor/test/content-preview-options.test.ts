import { describe, expect, it } from 'vitest';
import {
  isPreviewAttributeKey,
  partitionNodeAttributes,
  PREVIEW_ATTRIBUTE_KEYS,
} from '../src/ui/sidebar/properties/content/preview-attribute-keys.js';

describe('preview attribute keys', () => {
  it('matches the v1 allowlist exactly', () => {
    expect([...PREVIEW_ATTRIBUTE_KEYS]).toEqual([
      'readonly',
      'tabindex',
      'disabled',
      'aria-hidden',
      'contenteditable',
    ]);
  });

  it('recognizes allowlist keys case-insensitively', () => {
    expect(isPreviewAttributeKey('readonly')).toBe(true);
    expect(isPreviewAttributeKey('TABINDEX')).toBe(true);
    expect(isPreviewAttributeKey('type')).toBe(false);
  });

  it('splits node attributes into main and preview buckets', () => {
    const { main, preview } = partitionNodeAttributes({
      type: 'text',
      readonly: 'readonly',
      tabindex: '-1',
      autocomplete: 'off',
    });
    expect(main).toEqual([
      ['type', 'text'],
      ['autocomplete', 'off'],
    ]);
    expect(preview).toEqual([
      ['readonly', 'readonly'],
      ['tabindex', '-1'],
    ]);
  });
});
