import { isVoidHtmlTag } from '@facadeur/core';
import type { RenderBuildConfig } from '@facadeur/core';
import { Fragment, createElement, useLayoutEffect, useRef } from 'react';
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
  autocomplete: 'autoComplete',
  acceptcharset: 'acceptCharset',
  'http-equiv': 'httpEquiv',
};

const ignorePreviewChange = () => {};

export type PreviewBehaviorHandler = (nodeUuid: string, eventName: string, event: unknown) => void;

export function DynamicElement({
  config,
  behaviorHandler,
}: {
  config: RenderBuildConfig;
  behaviorHandler?: PreviewBehaviorHandler;
}) {
  const elementRef = useRef<HTMLElement | null>(null);
  const previousDomProperties = useRef<Readonly<Record<string, unknown>>>({});
  const children = config.children ?? [];
  const domProperties = domPropertiesFor(config);
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    for (const [name, value] of Object.entries(domProperties)) {
      if (value !== undefined && value !== null) {
        (element as unknown as Record<string, unknown>)[name] = value;
      }
    }
    for (const name of ['value', 'checked']) {
      if (name in previousDomProperties.current && !(name in domProperties)) {
        (element as unknown as Record<string, unknown>)[name] = name === 'checked' ? false : '';
      }
    }
    previousDomProperties.current = domProperties;
  }, [domProperties]);

  if (config.kind === 'fragment') {
    return createElement(
      Fragment,
      null,
      ...children.map((child, index) => (
        <DynamicElement
          key={
            child.renderKey ??
            child.nodeUuid ??
            `${child.kind === 'fragment' ? 'fragment' : child.tagName}-${index}`
          }
          config={child}
          behaviorHandler={behaviorHandler}
        />
      )),
    );
  }

  const { attributes = {}, dataset, nodeUuid, renderKey, styleNodeUuids, tagName, text } = config;
  const content = text;
  const attributeStyle = attributes.style;
  const props: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'style') continue;
    props[REACT_ATTRIBUTE_NAMES[name.toLowerCase()] ?? name] = value;
  }
  for (const [name, value] of Object.entries(dataset ?? {})) {
    props[`data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`] = value;
  }
  const normalizedTagName = tagName.toLowerCase();
  const isFormControl = ['input', 'select', 'textarea'].includes(normalizedTagName);
  const isCheckableInput =
    normalizedTagName === 'input' &&
    ['checkbox', 'radio'].includes(String(domProperties.type ?? props.type ?? '').toLowerCase());
  const hasValue = domProperties.value !== undefined && domProperties.value !== null;
  if (isCheckableInput) {
    props.checked = Boolean(domProperties.checked ?? props.checked ?? false);
    delete domProperties.checked;
    props.onChange ??= ignorePreviewChange;
  } else if (isFormControl) {
    // Keep form values out of React's controlled-input tracking. Preview data may
    // supply a value after the first render, so apply it through the DOM property.
    delete props.value;
    if (hasValue) {
      props.onChange ??= ignorePreviewChange;
      if (normalizedTagName === 'input' || normalizedTagName === 'textarea') {
        props.readOnly = true;
      }
    }
  }
  if (nodeUuid) props['data-facadeur-node-uuid'] = nodeUuid;
  if (nodeUuid && behaviorHandler) {
    for (const eventName of ['click', 'change', 'input', 'submit', 'keydown', 'focus', 'blur']) {
      const reactName = `on${eventName[0]?.toUpperCase()}${eventName.slice(1)}`;
      const existing = props[reactName];
      props[reactName] = (event: unknown) => {
        if (typeof existing === 'function') (existing as (event: unknown) => void)(event);
        behaviorHandler(nodeUuid, eventName, event);
      };
    }
  }
  if (nodeUuid || styleNodeUuids?.length) {
    const currentClass = typeof props.className === 'string' ? props.className : '';
    const styleClasses = new Set([...(styleNodeUuids ?? []), ...(nodeUuid ? [nodeUuid] : [])]);
    props.className = [currentClass, ...[...styleClasses].map((uuid) => `facadeur-node-${uuid}`)]
      .filter(Boolean)
      .join(' ');
  }
  if (attributeStyle) props.style = parseInlineStyle(attributeStyle);

  const renderedChildren = [
    ...(content !== undefined && content !== '' ? [content] : []),
    ...children.map((child, index) => (
      <DynamicElement
        key={
          child.renderKey ??
          child.nodeUuid ??
          `${child.kind === 'fragment' ? 'fragment' : child.tagName}-${index}`
        }
        config={child}
        behaviorHandler={behaviorHandler}
      />
    )),
  ];

  return createElement(
    tagName,
    { ...props, ref: elementRef } as HTMLAttributes<HTMLElement> & RefAttributes<HTMLElement>,
    ...(isVoidHtmlTag(tagName) ? [] : renderedChildren),
  );
}

function domPropertiesFor(config: RenderBuildConfig) {
  if (config.kind === 'fragment') return {};
  const properties: Record<string, unknown> = { ...(config.properties ?? {}) };
  const tagName = config.tagName.toLowerCase();
  const inputType = String(
    properties.type ?? attributeValue(config.attributes, 'type') ?? '',
  ).toLowerCase();
  const isCheckableInput = tagName === 'input' && ['checkbox', 'radio'].includes(inputType);

  if (
    ['input', 'select', 'textarea'].includes(tagName) &&
    !isCheckableInput &&
    properties.value == null
  ) {
    const value = attributeValue(config.attributes, 'value');
    if (value !== undefined) properties.value = value;
  }

  return properties;
}

function attributeValue(attributes: Readonly<Record<string, string>> | undefined, name: string) {
  return Object.entries(attributes ?? {}).find(([key]) => key.toLowerCase() === name)?.[1];
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
