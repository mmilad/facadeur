import type { StyleControllerTarget } from './types';

export function resolveTarget(
  target?: Document | HTMLStyleElement | StyleControllerTarget | null,
): {
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
