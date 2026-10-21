import { isVoidHtmlTag } from '@facadeur/core';
import type { RenderBuildConfig } from '@facadeur/core';
import { Fragment, createElement, useLayoutEffect, useRef } from 'react';
import type { CSSProperties, HTMLAttributes, RefAttributes } from 'react';
import type { FieldValue } from '@facadeur/domain';
import { reactEventPropFor } from './dom-events';

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

export type PreviewBehaviorHandler = (
  target: {
    readonly scopeKey: string;
    readonly definitionUuid: string;
    readonly nodeUuid: string;
    readonly props?: Readonly<Record<string, FieldValue>>;
    readonly repeaterIndices?: Readonly<Record<string, number>>;
  },
  eventName: string,
  event: unknown,
) => void;
export interface PreviewControlValue {
  readonly value?: string;
  readonly checked?: boolean;
}

export function DynamicElement({
  config,
  behaviorHandler,
  interactive = false,
  controlValues,
  onControlChange,
}: {
  config: RenderBuildConfig;
  behaviorHandler?: PreviewBehaviorHandler;
  interactive?: boolean;
  controlValues?: Readonly<Record<string, PreviewControlValue>>;
  onControlChange?: (key: string, value: PreviewControlValue) => void;
}) {
  const elementRef = useRef<HTMLElement | null>(null);
  const previousDomProperties = useRef<Readonly<Record<string, unknown>>>({});
  const children = config.children ?? [];
  const renderNodeUuid = config.kind === 'fragment' ? undefined : config.nodeUuid;
  const controlKey =
    config.kind === 'fragment'
      ? undefined
      : (config.instanceKey ?? config.renderKey ?? renderNodeUuid);
  const domProperties: Record<string, unknown> = {
    ...domPropertiesFor(config),
    ...(controlKey ? controlValues?.[controlKey] : undefined),
  };
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    for (const [name, value] of Object.entries(domProperties)) {
      if (interactive && (name === 'value' || name === 'checked')) continue;
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
  }, [domProperties, interactive]);

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
          interactive={interactive}
          controlValues={controlValues}
          onControlChange={onControlChange}
        />
      )),
    );
  }

  const { attributes = {}, dataset, nodeUuid, styleNodeUuids, tagName, text } = config;
  const content = interactive && tagName.toLowerCase() === 'textarea' ? undefined : text;
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
    if (interactive && controlKey && onControlChange) {
      props.onChange = (event: { readonly currentTarget: HTMLInputElement }) =>
        onControlChange(controlKey, { checked: event.currentTarget.checked });
    } else {
      props.onChange ??= ignorePreviewChange;
    }
  } else if (isFormControl) {
    if (interactive) {
      props.value = String(domProperties.value ?? props.value ?? '');
      if (controlKey && onControlChange) {
        props.onChange = (event: {
          readonly currentTarget: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        }) => onControlChange(controlKey, { value: event.currentTarget.value });
      }
    } else {
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
  }
  if (nodeUuid) props['data-facadeur-node-uuid'] = nodeUuid;
  if (behaviorHandler && config.behaviorTargets?.length) {
    const eventNames = [...new Set(config.behaviorTargets.flatMap((target) => target.events))];
    const isRepeaterDragSource = config.behaviorTargets.some(
      (target) =>
        target.events.includes('dragstart') && Object.keys(target.repeaterIndices ?? {}).length,
    );
    const isRepeaterDropTarget = config.behaviorTargets.some((target) =>
      target.events.includes('drop'),
    );
    if (isRepeaterDragSource) props.draggable = true;
    if (isRepeaterDropTarget) {
      props.onDragOver = (event: { preventDefault: () => void }) => event.preventDefault();
    }
    for (const eventName of eventNames) {
      const reactName = reactEventPropFor(eventName);
      if (!reactName) continue;
      const existing = props[reactName];
      props[reactName] = (event: unknown) => {
        if (eventName === 'dragstart') {
          const dataTransfer = (
            event as { dataTransfer?: { setData?: (type: string, value: string) => void } }
          ).dataTransfer;
          const indices = Object.assign(
            {},
            ...config.behaviorTargets!.map((target) => target.repeaterIndices ?? {}),
          );
          dataTransfer?.setData?.('application/x-facadeur-repeater', JSON.stringify(indices));
        }
        if (typeof existing === 'function') (existing as (event: unknown) => void)(event);
        for (const target of config.behaviorTargets ?? []) {
          if (target.events.includes(eventName)) behaviorHandler(target, eventName, event);
        }
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
        interactive={interactive}
        controlValues={controlValues}
        onControlChange={onControlChange}
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
