/** Common HTML tag names for catalog node `dom.tagName` presets. */
export const DEFAULT_HTML_TAG_OPTIONS = [
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
  'video',
] as const;

export type DefaultHtmlTag = (typeof DEFAULT_HTML_TAG_OPTIONS)[number];

/** HTML elements that cannot contain child nodes. */
export const VOID_HTML_TAGS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
] as const;

const voidHtmlTagSet = new Set<string>(VOID_HTML_TAGS);

export function isVoidHtmlTag(tagName: string): boolean {
  return voidHtmlTagSet.has(tagName.toLowerCase());
}

export function htmlTagOptions(current?: string): readonly string[] {
  if (current && !DEFAULT_HTML_TAG_OPTIONS.includes(current as DefaultHtmlTag)) {
    return [current, ...DEFAULT_HTML_TAG_OPTIONS];
  }
  return DEFAULT_HTML_TAG_OPTIONS;
}
