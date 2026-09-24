/**
 * Live CSS rules via `insertRule`, adapted from mmilad/style-controller.
 *
 * Child rules are real stylesheet rules. The selector is the parent selector
 * plus the child selector, so renaming a parent updates its descendants.
 * They are not nested CSSOM rules: `CSSStyleRule.insertRule` is CSS nesting
 * and is missing in some documents the engine has to drive (jsdom, older
 * iframes). The relationship lives on the `Rule` objects instead.
 */

export interface RuleChild {
  selector: string;
  rules: RuleInput;
}

/** CSS declarations plus optional child rules. `children` is not a declaration. */
export interface RuleInput {
  children?: RuleChild[];
  [property: string]: string | number | RuleChild[] | undefined;
}

export interface StyleControllerTarget {
  /** Document that owns the stylesheet. Defaults to the global document. */
  document?: Document;
  /** Existing style element. Created in `document.head` when omitted. */
  styleElement?: HTMLStyleElement;
}

type StyleOwner = CSSStyleSheet | CSSGroupingRule;

export class Rule {
  /** The live CSS rule. Declarations are changed through `style` or `update`. */
  readonly cssRule: CSSStyleRule;
  private readonly owner: StyleOwner;
  private parent: Rule | null;
  private suffix: string;
  private children: Rule[] = [];
  private detached = false;

  constructor(
    owner: StyleOwner,
    cssRule: CSSStyleRule,
    suffix: string,
    parent: Rule | null,
    private readonly onDetach: (() => void) | null = null,
  ) {
    this.owner = owner;
    this.cssRule = cssRule;
    this.suffix = suffix;
    this.parent = parent;
  }

  get selector(): string {
    return this.fullSelector();
  }

  set selector(value: string) {
    this.suffix = value;
    this.applySelector();
  }

  get style(): CSSStyleDeclaration {
    return this.cssRule.style;
  }

  insert(selector: string, input: RuleInput = {}): Rule {
    const { declarations, children } = splitRuleInput(input);
    const cssRule = appendStyleRule(this.owner, this.childSelector(selector), declarations);
    const rule = new Rule(this.owner, cssRule, selector, this);
    this.children.push(rule);
    for (const child of children) rule.insert(child.selector, child.rules);
    return rule;
  }

  update(input: RuleInput): void {
    const { declarations, children } = splitRuleInput(input);
    for (const [property, value] of Object.entries(declarations)) {
      this.cssRule.style.setProperty(toKebab(property), String(value));
    }
    for (const child of children) this.insert(child.selector, child.rules);
  }

  /**
   * Remove this rule and every child rule from the stylesheet.
   * Deleting a rule the controller does not own is a no-op at the controller;
   * calling `delete` on the rule itself still removes it when it is attached.
   */
  delete(): void {
    if (this.detached) return;
    this.detached = true;
    for (const child of [...this.children]) child.delete();
    this.children = [];
    const index = indexOfRule(this.owner, this.cssRule);
    if (index >= 0) this.owner.deleteRule(index);
    this.parent?.unregister(this);
    this.onDetach?.();
    this.parent = null;
  }

  /** @internal Parent bookkeeping. Index 0 is a real child. */
  unregister(child: Rule): void {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
  }

  private childSelector(suffix: string): string {
    return `${this.fullSelector()} ${suffix}`.trim();
  }

  private fullSelector(): string {
    if (!this.parent) return this.suffix;
    return `${this.parent.fullSelector()} ${this.suffix}`.trim();
  }

  private applySelector(): void {
    this.cssRule.selectorText = this.fullSelector();
    for (const child of this.children) child.applySelector();
  }
}

export class StyleController {
  readonly styleElement: HTMLStyleElement;
  readonly ownerDocument: Document;
  private readonly ownsElement: boolean;
  private children: Rule[] = [];

  constructor(target?: Document | HTMLStyleElement | StyleControllerTarget | null) {
    const resolved = resolveTarget(target);
    this.ownerDocument = resolved.document;
    this.styleElement = resolved.styleElement;
    this.ownsElement = resolved.created;
    if (!this.styleElement.sheet) {
      throw new Error('Style element has no CSSStyleSheet');
    }
  }

  get sheet(): CSSStyleSheet {
    const sheet = this.styleElement.sheet;
    if (!sheet) throw new Error('Style element has no CSSStyleSheet');
    return sheet;
  }

  insert(selector: string, input: RuleInput = {}): Rule {
    const { declarations, children } = splitRuleInput(input);
    const cssRule = appendStyleRule(this.sheet, selector, declarations);
    const rule = new Rule(this.sheet, cssRule, selector, null, () => {
      const index = this.children.indexOf(rule);
      if (index >= 0) this.children.splice(index, 1);
    });
    this.children.push(rule);
    for (const child of children) rule.insert(child.selector, child.rules);
    return rule;
  }

  /**
   * Remove one top-level rule and its children.
   * Index 0 is included. An unknown rule does not remove the last rule.
   */
  delete(rule: Rule): void {
    const index = this.children.indexOf(rule);
    // -1 used to be truthy and spliced the last rule. 0 used to be skipped.
    if (index < 0) return;
    rule.delete();
  }

  disable(disable = true): boolean {
    this.styleElement.disabled = disable;
    return disable;
  }

  /** Top-level style rules keyed by selector. Later duplicates replace earlier ones. */
  getRules(): Record<string, CSSStyleRule> {
    const rules: Record<string, CSSStyleRule> = {};
    for (let index = 0; index < this.sheet.cssRules.length; index += 1) {
      const rule = this.sheet.cssRules[index];
      if (rule && isStyleRule(rule)) rules[rule.selectorText] = rule;
    }
    return rules;
  }

  destroy(): void {
    for (const child of [...this.children]) this.delete(child);
    if (this.ownsElement) this.styleElement.remove();
  }
}

export function toKebab(property: string): string {
  if (property.startsWith('--')) return property;
  return property.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (letters, offset) => {
    return (offset ? '-' : '') + letters.toLowerCase();
  });
}

function appendStyleRule(
  owner: StyleOwner,
  selector: string,
  declarations: Record<string, string | number>,
): CSSStyleRule {
  const body = Object.entries(declarations)
    .map(([property, value]) => `${toKebab(property)}: ${value};`)
    .join('');
  const index = owner.cssRules.length;
  owner.insertRule(`${selector} {${body}}`, index);
  const rule = owner.cssRules[index];
  if (!rule || !isStyleRule(rule)) {
    throw new Error(`Insert did not produce a style rule for ${selector}`);
  }
  return rule;
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.type === CSSRule.STYLE_RULE;
}

function splitRuleInput(input: RuleInput): {
  declarations: Record<string, string | number>;
  children: RuleChild[];
} {
  const declarations: Record<string, string | number> = {};
  const children = input.children ?? [];
  for (const [key, value] of Object.entries(input)) {
    if (key === 'children' || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number') declarations[key] = value;
  }
  return { declarations, children };
}

function indexOfRule(owner: StyleOwner, rule: CSSRule): number {
  for (let index = 0; index < owner.cssRules.length; index += 1) {
    if (owner.cssRules[index] === rule) return index;
  }
  return -1;
}

function resolveTarget(target?: Document | HTMLStyleElement | StyleControllerTarget | null): {
  document: Document;
  styleElement: HTMLStyleElement;
  created: boolean;
} {
  if (isStyleElement(target)) {
    const owner = target.ownerDocument ?? globalDocument();
    if (!target.sheet) connectStyleElement(owner, target);
    return { document: owner, styleElement: target, created: false };
  }
  if (isDocument(target)) {
    return { document: target, styleElement: createStyleElement(target), created: true };
  }
  const owner = target?.document ?? globalDocument();
  if (target?.styleElement) {
    if (target.styleElement.ownerDocument !== owner) {
      throw new Error('styleElement belongs to a different document');
    }
    if (!target.styleElement.sheet) connectStyleElement(owner, target.styleElement);
    return { document: owner, styleElement: target.styleElement, created: false };
  }
  return { document: owner, styleElement: createStyleElement(owner), created: true };
}

function createStyleElement(owner: Document): HTMLStyleElement {
  const element = owner.createElement('style');
  element.dataset.facadeurStyles = 'true';
  connectStyleElement(owner, element);
  return element;
}

function connectStyleElement(owner: Document, element: HTMLStyleElement): void {
  if (element.isConnected) return;
  const parent = owner.head ?? owner.documentElement;
  if (!parent) throw new Error('Document has nowhere to attach a style element');
  parent.append(element);
}

function globalDocument(): Document {
  const owner = globalThis.document;
  if (!owner) throw new Error('No document to attach the style engine to');
  return owner;
}

function isDocument(value: unknown): value is Document {
  return isNode(value) && value.nodeType === 9;
}

function isStyleElement(value: unknown): value is HTMLStyleElement {
  return isNode(value) && value.nodeType === 1 && 'tagName' in value && value.tagName === 'STYLE';
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'nodeType' in value;
}
