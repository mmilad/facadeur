export const HTML_TAG_OPTIONS = [
  'a',
  'article',
  'aside',
  'button',
  'div',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'img',
  'input',
  'label',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'span',
  'textarea',
  'ul',
] as const;

export const HTML_ATTRIBUTE_ENUMS: Record<string, readonly string[]> = {
  type: ['button', 'submit', 'reset', 'checkbox', 'radio', 'text', 'email', 'password', 'search'],
  inputmode: ['none', 'text', 'decimal', 'numeric', 'tel', 'search', 'email', 'url'],
  role: ['button', 'link', 'img', 'list', 'listitem', 'navigation', 'region'],
};

export function attributeEnumOptions(name: string): readonly string[] | null {
  return HTML_ATTRIBUTE_ENUMS[name] ?? HTML_ATTRIBUTE_ENUMS[name.toLowerCase()] ?? null;
}
