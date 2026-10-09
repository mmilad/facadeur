import { describe, expect, it } from 'vitest';
import { isVoidHtmlTag, VOID_HTML_TAGS } from '../src/document/html-tags';

describe('HTML void tags', () => {
  it('recognizes void elements case-insensitively', () => {
    expect(isVoidHtmlTag('img')).toBe(true);
    expect(isVoidHtmlTag('INPUT')).toBe(true);
    expect(isVoidHtmlTag('span')).toBe(false);
  });

  it('exposes the standard HTML void tag names', () => {
    expect(VOID_HTML_TAGS).toContain('img');
    expect(VOID_HTML_TAGS).toContain('input');
    expect(VOID_HTML_TAGS).toContain('wbr');
  });
});
