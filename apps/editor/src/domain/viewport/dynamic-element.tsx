import { isVoidHtmlTag } from '@facadeur/core';
import type { ElementBuildConfig } from '@facadeur/core';
import { createElement, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, RefAttributes } from 'react';

const REACT_ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  srcset: 'srcSet',
  crossorigin: 'crossOrigin',
  acceptcharset: 'acceptCharset',
  'http-equiv': 'httpEquiv',
};

export function DynamicElement({ config }: { config: ElementBuildConfig }) {
  const elementRef = useRef<HTMLElement | null>(null);
  const {
    attributes = {},
    children = [],
    dataset,
    nodeUuid,
    properties,
    style,
    tagName,
    text,
  } = config;
  const { textContent: legacyTextContent, ...domProperties } = properties ?? {};
  const content = text ?? (typeof legacyTextContent === 'string' ? legacyTextContent : undefined);
  const attributeStyle = attributes.style;
  const props: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'style') continue;
    props[REACT_ATTRIBUTE_NAMES[name.toLowerCase()] ?? name] = value;
  }
  for (const [name, value] of Object.entries(dataset ?? {})) {
    props[`data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`] = value;
  }
  if (nodeUuid) props['data-facadeur-node-uuid'] = nodeUuid;
  if (style) props.style = reactStyle(style);
  if (attributeStyle)
    props.style = { ...parseInlineStyle(attributeStyle), ...reactStyle(style ?? {}) };

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !Object.keys(domProperties).length) return;
    for (const [name, value] of Object.entries(domProperties)) {
      if (value !== undefined && value !== null) {
        (element as unknown as Record<string, unknown>)[name] = value;
      }
    }
  }, [domProperties]);

  const renderedChildren = [
    ...(content !== undefined && content !== '' ? [content] : []),
    ...children.map((child, index) => (
      <DynamicElement key={child.nodeUuid ?? `${child.tagName}-${index}`} config={child} />
    )),
  ];

  return createElement(
    tagName,
    { ...props, ref: elementRef } as HTMLAttributes<HTMLElement> & RefAttributes<HTMLElement>,
    ...(isVoidHtmlTag(tagName) ? [] : renderedChildren),
  );
}

function reactStyle(style: Readonly<Record<string, string>>): CSSProperties {
  return Object.fromEntries(
    Object.entries(style).map(([name, value]) => [cssPropertyName(name), value]),
  ) as CSSProperties;
}

function cssPropertyName(name: string) {
  if (name.startsWith('--')) return name;
  const camelCase = name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return camelCase.startsWith('ms-') ? `ms${camelCase.slice(3)}` : camelCase;
}

function parseInlineStyle(value: string): CSSProperties {
  const declaration = document.createElement('span').style;
  declaration.cssText = value;
  return Object.fromEntries(
    Array.from({ length: declaration.length }, (_, index) => {
      const name = declaration.item(index);
      return [cssPropertyName(name), declaration.getPropertyValue(name)];
    }),
  ) as CSSProperties;
}
