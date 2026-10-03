import { describe, expect, it } from 'vitest';
import { defaultBreakpoints } from '@facadeur/core';
import { resolvedViewportChrome } from '../src/domain/viewport/viewport-chrome';

describe('viewport chrome settings', () => {
  it('ignores legacy padding while preserving title and alignment', () => {
    const breakpoint = defaultBreakpoints[0]!;
    const resolved = resolvedViewportChrome(breakpoint, {
      title: '  Phone preview  ',
      outerPaddingPx: 999,
      innerPaddingPx: -4,
      contentAlign: 'center',
    });
    expect(resolved.title).toBe('Phone preview');
    expect(resolved.outerPaddingPx).toBe(0);
    expect(resolved.innerPaddingPx).toBe(0);
    expect(resolved.contentAlign).toBe('center');
  });

  it('uses breakpoint label when title is blank', () => {
    const breakpoint = { id: 'tablet', minWidth: 768 };
    expect(resolvedViewportChrome(breakpoint, { title: '' }).title).toBe('Tablet · 768');
  });
});
