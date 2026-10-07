import type { Binding, FieldValue } from '@facadeur/core';

const EVENT_ATTRIBUTE = /^on/i;
const BOOLEAN_ATTRIBUTES = new Set([
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formnovalidate',
  'hidden',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'selected',
]);

export function isNativeControlElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea';
}

export function elementFor(tag: string, owner: Document): HTMLElement {
  return owner.createElement(tag);
}

/**
 * Elements can come from an iframe document, so `instanceof HTMLElement` is not reliable.
 */
export function isHtmlElement(value: unknown): value is HTMLElement {
  return isNode(value) && value.nodeType === Node.ELEMENT_NODE && 'dataset' in value;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'nodeType' in value;
}

export function syncLeadText(parent: HTMLElement, text: string | null): void {
  const texts = [...parent.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
  if (!text) {
    for (const node of texts) node.remove();
    return;
  }
  const first = texts[0];
  if (first) {
    if (first.textContent !== text) first.textContent = text;
    for (const extra of texts.slice(1)) extra.remove();
    if (parent.firstChild !== first) parent.insertBefore(first, parent.firstChild);
    return;
  }
  parent.insertBefore(parent.ownerDocument.createTextNode(text), parent.firstChild);
}

export function syncVariants(el: HTMLElement, variants: Record<string, string>): void {
  for (const attribute of [...el.attributes]) {
    if (attribute.name === 'data-variant') {
      if (variants.variant === undefined) el.removeAttribute(attribute.name);
      continue;
    }
    if (!attribute.name.startsWith('data-variant-')) continue;
    const axis = attribute.name.slice('data-variant-'.length);
    if (variants[axis] === undefined) el.removeAttribute(attribute.name);
  }
  for (const [axis, value] of Object.entries(variants)) {
    if (axis === 'variant') el.setAttribute('data-variant', value);
    else el.setAttribute(`data-variant-${axis}`, value);
  }
}

export function clearPresentation(el: HTMLElement): void {
  applyAttributes(el, {});
}

export function applyAttributes(
  el: HTMLElement,
  attributes: Record<string, string> | undefined,
): void {
  const desired: Record<string, string> = {};
  for (const [name, value] of Object.entries(attributes ?? {})) {
    if (EVENT_ATTRIBUTE.test(name)) continue;
    desired[name] = value;
  }
  for (const attribute of [...el.attributes]) {
    if (attribute.name.startsWith('data-') || attribute.name === 'style') continue;
    if (desired[attribute.name] === undefined) el.removeAttribute(attribute.name);
  }
  for (const [name, value] of Object.entries(desired)) el.setAttribute(name, value);
}

export function applyImage(
  el: HTMLElement,
  src: string | undefined,
  alt: string | undefined,
): void {
  if (src !== undefined) el.setAttribute('src', src);
  else el.removeAttribute('src');
  if (alt !== undefined) el.setAttribute('alt', alt);
  else el.removeAttribute('alt');
}

export function applyMediaNode(
  el: HTMLElement,
  tag: string,
  src: string | undefined,
  alt: string | undefined,
): void {
  if (tag.toLowerCase() === 'video') {
    if (src !== undefined) el.setAttribute('src', src);
    else el.removeAttribute('src');
    return;
  }
  applyImage(el, src, alt);
}

export function applyBindings(
  el: HTMLElement,
  bindings: Binding[] | undefined,
  scope: Record<string, FieldValue>,
): { text: string | null; src?: string; alt?: string; hidden: boolean } {
  let text: string | null = null;
  let src: string | undefined;
  let alt: string | undefined;
  let hidden = false;
  for (const binding of bindings ?? []) {
    const value = scope[binding.field];
    if (value === undefined) continue;
    if (binding.target === 'text') text = String(value);
    else if (
      binding.target === 'attribute' &&
      binding.name &&
      !EVENT_ATTRIBUTE.test(binding.name)
    ) {
      if (typeof value === 'boolean' && BOOLEAN_ATTRIBUTES.has(binding.name.toLowerCase())) {
        if (value) el.setAttribute(binding.name, '');
        else el.removeAttribute(binding.name);
      } else {
        const previous = el.getAttribute(binding.name);
        el.setAttribute(binding.name, String(value));
        if (
          binding.name === 'value' &&
          el.tagName.toLowerCase() === 'textarea' &&
          previous !== String(value)
        ) {
          (el as HTMLTextAreaElement).value = String(value);
        }
      }
    } else if (binding.target === 'style' && binding.name) {
      el.style.setProperty(binding.name, String(value));
    } else if (binding.target === 'src') src = String(value);
    else if (binding.target === 'alt') alt = String(value);
    else if (binding.target === 'visible') hidden = value === false;
  }
  return { text, src, alt, hidden };
}

export function readAttributes(el: HTMLElement): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attribute of el.attributes) {
    if (attribute.name === 'style' || attribute.name.startsWith('data-')) continue;
    attributes[attribute.name] = attribute.value;
  }
  return attributes;
}
