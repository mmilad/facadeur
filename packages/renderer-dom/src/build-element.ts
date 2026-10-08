import type { ElementBuildConfig } from '@facadeur/domain';

export type ElementBuildOptions = {
  document?: Document;
  events?: Readonly<Record<string, readonly ((event: Event) => void)[]>>;
};

export function buildElement(
  config: ElementBuildConfig,
  options: ElementBuildOptions = {},
): HTMLElement {
  const doc = options.document ?? window.document;
  const el = doc.createElement(config.tagName || 'div');
  if (config.text) el.textContent = config.text;
  if (config.attributes) {
    for (const [name, value] of Object.entries(config.attributes)) {
      if (value !== '') el.setAttribute(name, value);
    }
  }
  if (config.dataset) {
    for (const [key, value] of Object.entries(config.dataset)) {
      el.dataset[key] = value;
    }
  }
  if (config.style) {
    for (const [key, value] of Object.entries(config.style)) {
      (el.style as unknown as Record<string, string>)[key] = value;
    }
  }
  if (config.properties) {
    for (const [key, value] of Object.entries(config.properties)) {
      if (value !== undefined && value !== null) {
        (el as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }
  if (config.children) {
    for (const child of config.children) {
      el.appendChild(buildElement(child, options));
    }
  }
  const events = options.events;
  if (events) {
    for (const [eventName, handlers] of Object.entries(events)) {
      for (const handler of handlers) el.addEventListener(eventName, handler);
    }
  }
  if (config.nodeUuid) el.dataset.facadeurNodeUuid = config.nodeUuid;
  return el;
}
