import { describe, expect, it } from 'vitest';
import {
  formatCssDeclarations,
  parseCssDeclarations,
} from '../src/domain/style-rules/css-declarations';

describe('CSS declaration drafts', () => {
  it('splits only at top level and preserves values containing delimiters', () => {
    expect(
      parseCssDeclarations(`
        /* selector text is kept outside this editor */
        color: var(--tone, rgb(10, 20, 30));
        content: "semi; colon: and /* text */";
        --nested: { key: [value; other] };
        background: url("data:image/svg+xml;utf8,<svg/>");
      `),
    ).toEqual({
      ok: true,
      declarations: {
        color: 'var(--tone, rgb(10, 20, 30))',
        content: '"semi; colon: and /* text */"',
        '--nested': '{ key: [value; other] }',
        background: 'url("data:image/svg+xml;utf8,<svg/>")',
      },
    });
  });

  it('allows comments between declarations and uses the last duplicate property', () => {
    expect(parseCssDeclarations('color: red; /* keep editing */ COLOR: blue;')).toEqual({
      ok: true,
      declarations: { color: 'blue' },
    });
  });

  it('returns an inline syntax offset for malformed declarations and unclosed constructs', () => {
    for (const source of ['color red;', 'color: ;', 'color: var(--tone;', 'content: "open']) {
      const result = parseCssDeclarations(source);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.offset).toBeGreaterThanOrEqual(0);
    }
  });

  it('formats the shared declaration map as plain CSS text', () => {
    expect(
      formatCssDeclarations({ color: 'red', letterSpacing: '2px', '--Tone': 'var(--x)' }),
    ).toBe('color: red;\nletter-spacing: 2px;\n--Tone: var(--x);');
    expect(parseCssDeclarations('letter-spacing: 2px; --Tone: var(--x);')).toEqual({
      ok: true,
      declarations: { 'letter-spacing': '2px', '--Tone': 'var(--x)' },
    });
  });
});
