import { DEFAULT_HTML_TAG_OPTIONS } from '@facadeur/core';

export const HTML_TAG_OPTIONS = DEFAULT_HTML_TAG_OPTIONS;

export const HTML_ATTRIBUTE_ENUMS: Record<string, readonly string[]> = {
  type: ['button', 'submit', 'reset', 'checkbox', 'radio', 'text', 'email', 'password', 'search'],
  inputmode: ['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'],
  role: ['button', 'link', 'img', 'list', 'listitem', 'navigation', 'region', 'group', 'radiogroup'],
};

export function attributeEnumOptions(name: string): readonly string[] | null {
  return HTML_ATTRIBUTE_ENUMS[name] ?? HTML_ATTRIBUTE_ENUMS[name.toLowerCase()] ?? null;
}
