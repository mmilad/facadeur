/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { StyleController } from '@facadeur/style-engine';

describe('style controller', () => {
  it('inserts a rule and updates its declarations', () => {
    const controller = new StyleController(document);
    const rule = controller.insert('.foo', { backgroundColor: 'red' });
    expect(rule.style.getPropertyValue('background-color')).toBe('red');
    rule.update({ backgroundColor: 'green', padding: '10px' });
    expect(rule.style.getPropertyValue('background-color')).toBe('green');
    expect(rule.style.getPropertyValue('padding')).toBe('10px');
    expect(controller.getRules()['.foo']).toBe(rule.cssRule);
    controller.destroy();
  });

  it('inserts children passed to Rule and keeps their selectors under the parent', () => {
    const controller = new StyleController(document);
    const parent = controller.insert('.foo', {
      backgroundColor: 'red',
      children: [{ selector: '.bar', rules: { padding: '10px' } }],
    });
    const selectors = [...controller.sheet.cssRules].map((rule) =>
      rule.type === CSSRule.STYLE_RULE ? (rule as CSSStyleRule).selectorText : rule.cssText,
    );
    expect(selectors).toContain('.foo');
    expect(selectors).toContain('.foo .bar');
    parent.selector = '.foo-bar';
    const renamed = [...controller.sheet.cssRules].map((rule) =>
      rule.type === CSSRule.STYLE_RULE ? (rule as CSSStyleRule).selectorText : '',
    );
    expect(renamed).toContain('.foo-bar');
    expect(renamed).toContain('.foo-bar .bar');
    expect(renamed).not.toContain('.foo .bar');
    controller.destroy();
  });

  it('deletes the rule at index 0 and does not delete the last rule for an unknown rule', () => {
    const controller = new StyleController(document);
    const first = controller.insert('.first', { color: 'red' });
    const second = controller.insert('.second', { color: 'blue' });
    controller.delete(first);
    const selectors = [...controller.sheet.cssRules].map((rule) =>
      rule.type === CSSRule.STYLE_RULE ? (rule as CSSStyleRule).selectorText : '',
    );
    expect(selectors).not.toContain('.first');
    expect(selectors).toContain('.second');

    const outsider = new StyleController(document);
    const foreign = outsider.insert('.foreign', { color: 'black' });
    controller.delete(foreign);
    const after = [...controller.sheet.cssRules].map((rule) =>
      rule.type === CSSRule.STYLE_RULE ? (rule as CSSStyleRule).selectorText : '',
    );
    expect(after).toContain('.second');
    expect(second.style.color).toBe('blue');
    outsider.destroy();
    controller.destroy();
  });

  it('deletes a rule and the children that were inserted under it', () => {
    const controller = new StyleController(document);
    const parent = controller.insert('.parent', {
      children: [{ selector: '.child', rules: { color: 'red' } }],
    });
    parent.delete();
    const selectors = [...controller.sheet.cssRules].map((rule) =>
      rule.type === CSSRule.STYLE_RULE ? (rule as CSSStyleRule).selectorText : '',
    );
    expect(selectors).not.toContain('.parent');
    expect(selectors).not.toContain('.parent .child');
    controller.destroy();
  });

  it('attaches its style element to the document it was given', () => {
    // An iframe document has a browsing context, so its style element gets a
    // CSSStyleSheet. createHTMLDocument() does not, in jsdom.
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const other = iframe.contentDocument;
    if (!other) throw new Error('iframe has no document');
    const controller = new StyleController(other);
    controller.insert('.inside', { color: 'navy' });
    expect(other.head.querySelector('style')).toBe(controller.styleElement);
    expect(document.head.contains(controller.styleElement)).toBe(false);
    expect(controller.ownerDocument).toBe(other);
    controller.destroy();
    expect(other.head.querySelector('style')).toBeNull();
  });
});
