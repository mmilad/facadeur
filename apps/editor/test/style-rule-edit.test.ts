import { describe, expect, it } from 'vitest';
import type { StyleBlock, StyleRule } from '@facadeur/core';
import {
  readStyleRuleLayerDeclarations,
  readStyleRuleFallback,
  replaceStyleRuleDeclarations,
  writeStyleRuleDeclarations,
} from '../src/domain/style-rules/style-rule-edit.js';

const rule: StyleRule = {
  id: 'selected',
  selector: '.root:hover',
  bindings: { root: 'root' },
  declarations: { color: 'black' },
  states: { hover: { color: 'blue' } },
  breakpoints: { tablet: { declarations: { color: 'navy' } } },
  variants: { tone: { loud: { declarations: { color: 'red' } } } },
};

describe('sparse style rule editing', () => {
  it('replaces only the selected state layer and keeps sibling layers', () => {
    const block: StyleBlock = { rules: [rule] };
    const next = replaceStyleRuleDeclarations(
      block,
      'selected',
      { state: 'hover' },
      { color: 'green' },
    );
    expect(next?.rules?.[0]?.states?.hover).toEqual({ color: 'green' });
    expect(next?.rules?.[0]?.declarations).toEqual({ color: 'black' });
    expect(next?.rules?.[0]?.breakpoints).toEqual(rule.breakpoints);
  });

  it('clears a draft from only the current breakpoint layer', () => {
    const block: StyleBlock = { rules: [rule] };
    expect(readStyleRuleLayerDeclarations(rule, { breakpointId: 'tablet' })).toEqual({
      color: 'navy',
    });
    const next = replaceStyleRuleDeclarations(block, 'selected', { breakpointId: 'tablet' }, {});
    expect(next?.rules?.[0]?.breakpoints).toBeUndefined();
    expect(next?.rules?.[0]?.declarations).toEqual({ color: 'black' });
  });

  it('uses preceding breakpoint and inherited base rule values as the lower layer', () => {
    const resolved: StyleRule = {
      ...rule,
      declarations: { color: 'black', display: 'block' },
      states: { hover: { color: 'blue', opacity: '0.8' } },
      breakpoints: {
        tablet: { declarations: { color: 'navy', margin: '10px' } },
        desktop: { states: { hover: { color: 'purple' } } },
      },
    };
    expect(
      readStyleRuleFallback(resolved, { breakpointId: 'desktop', state: 'hover' }, [
        { id: 'tablet', minWidth: 700 },
        { id: 'desktop', minWidth: 1100 },
      ]),
    ).toEqual({ color: 'blue', display: 'block', margin: '10px', opacity: '0.8' });
  });

  it('writes one named axis value without disturbing other rule metadata', () => {
    const block: StyleBlock = { rules: [rule] };
    const next = writeStyleRuleDeclarations(
      block,
      'selected',
      { axis: 'tone', value: 'loud' },
      { color: null, background: 'red' },
    );
    expect(next?.rules?.[0]?.variants?.tone?.loud).toEqual({ declarations: { background: 'red' } });
    expect(next?.rules?.[0]?.selector).toBe(rule.selector);
    expect(next?.rules?.[0]?.bindings).toEqual(rule.bindings);
  });
});
