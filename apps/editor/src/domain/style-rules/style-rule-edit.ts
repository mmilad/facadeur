import type { StyleBlock, StyleRule } from '@facadeur/core';
import {
  canonicalStyleProperty,
  effectiveStyleDeclarations,
  writeStyleDeclarations,
  type StyleBreakpointRef,
  type StyleEditTarget,
} from '../edits/style-edit.js';

/** Read one rule's currently effective declarations without changing its owner document. */
export function readStyleRuleDeclarations(
  rule: StyleRule,
  target: Omit<StyleEditTarget, 'nodeId'>,
  breakpoints: readonly StyleBreakpointRef[] = [],
): Record<string, string> {
  return canonicalDeclarations(
    effectiveStyleDeclarations(
      ruleBlock(rule),
      rule.id,
      { nodeId: rule.id, ...target },
      breakpoints,
    ),
  );
}

/** Read only declarations physically stored in the selected sparse rule layer. */
export function readStyleRuleLayerDeclarations(
  rule: StyleRule,
  target: Omit<StyleEditTarget, 'nodeId'>,
): Record<string, string> {
  const layer =
    target.axis && target.value !== undefined
      ? rule.variants?.[target.axis]?.[target.value]
      : target.breakpointId
        ? rule.breakpoints?.[target.breakpointId]
        : rule;
  return canonicalDeclarations(
    target.state ? (layer?.states?.[target.state] ?? {}) : (layer?.declarations ?? {}),
  );
}

/** Effective rule values with only the selected sparse layer removed. */
export function readStyleRuleFallback(
  rule: StyleRule,
  target: Omit<StyleEditTarget, 'nodeId'>,
  breakpoints: readonly StyleBreakpointRef[] = [],
): Record<string, string> {
  const block = ruleBlock(rule);
  const layer = target.breakpointId ? block.breakpoints?.[target.breakpointId] : block;
  if (target.state) {
    const states = layer?.states;
    if (states) delete states[target.state];
  } else if (target.breakpointId && layer) {
    delete layer.declarations;
  }
  return canonicalDeclarations(
    effectiveStyleDeclarations(block, rule.id, { nodeId: rule.id, ...target }, breakpoints),
  );
}

/** Replace one sparse rule layer while preserving its selector, bindings, order, and other layers. */
export function writeStyleRuleDeclarations(
  block: StyleBlock | undefined,
  ruleId: string,
  target: Omit<StyleEditTarget, 'nodeId'>,
  declarations: Record<string, string | null>,
): StyleBlock | null {
  return updateStyleRuleDeclarations(block, ruleId, target, declarations);
}

function canonicalDeclarations(source: Record<string, string>): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const [property, value] of Object.entries(source)) {
    declarations[property.startsWith('--') ? property : canonicalStyleProperty(property)] = value;
  }
  return declarations;
}

export function ensureStyleRule(block: StyleBlock | undefined, source: StyleRule): StyleBlock {
  const next: StyleBlock = block ? structuredClone(block) : {};
  const rules = (next.rules ??= []);
  if (rules.some((candidate) => candidate.id === source.id)) return next;
  rules.push({
    id: source.id,
    selector: source.selector,
    bindings: structuredClone(source.bindings),
  });
  return next;
}

/** Apply a CSS declaration-list draft to only the selected sparse rule layer. */
export function replaceStyleRuleDeclarations(
  block: StyleBlock | undefined,
  ruleId: string,
  target: Omit<StyleEditTarget, 'nodeId'>,
  declarations: Record<string, string>,
): StyleBlock | null {
  const rule = block?.rules?.find((candidate) => candidate.id === ruleId);
  if (!rule) return block ? structuredClone(block) : null;
  const own = readStyleRuleLayerDeclarations(rule, target);
  const patch = Object.fromEntries([
    ...Object.keys(own).map((property) => [property, null] as const),
    ...Object.entries(declarations),
  ]);
  return updateStyleRuleDeclarations(block, ruleId, target, patch);
}

function updateStyleRuleDeclarations(
  block: StyleBlock | undefined,
  ruleId: string,
  target: Omit<StyleEditTarget, 'nodeId'>,
  patch: Record<string, string | null>,
): StyleBlock | null {
  const ruleIndex = block?.rules?.findIndex((candidate) => candidate.id === ruleId) ?? -1;
  if (!block || ruleIndex < 0) return block ? structuredClone(block) : null;
  const rules = structuredClone(block.rules ?? []);
  const rule = rules[ruleIndex]!;
  const nextLayer = writeStyleDeclarations(
    ruleBlock(rule),
    rule.id,
    { nodeId: rule.id, ...target },
    patch,
  );
  const identity: Pick<StyleRule, 'id' | 'selector' | 'bindings'> = {
    id: rule.id,
    selector: rule.selector,
    bindings: structuredClone(rule.bindings),
  };
  rules[ruleIndex] = { ...identity, ...layerFields(nextLayer) };
  const next: StyleBlock = { ...structuredClone(block), rules };
  if (!rules.length) delete next.rules;
  return next;
}

function ruleBlock(rule: StyleRule): StyleBlock {
  return {
    ...(rule.declarations ? { declarations: structuredClone(rule.declarations) } : {}),
    ...(rule.states ? { states: structuredClone(rule.states) } : {}),
    ...(rule.variants ? { variants: structuredClone(rule.variants) } : {}),
    ...(rule.breakpoints ? { breakpoints: structuredClone(rule.breakpoints) } : {}),
  };
}

function layerFields(
  block: StyleBlock | null,
): Pick<StyleRule, 'declarations' | 'states' | 'variants' | 'breakpoints'> {
  if (!block) return {};
  return {
    ...(block.declarations ? { declarations: block.declarations } : {}),
    ...(block.states ? { states: block.states } : {}),
    ...(block.variants ? { variants: block.variants } : {}),
    ...(block.breakpoints ? { breakpoints: block.breakpoints } : {}),
  };
}
