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

export function htmlTagOptions(current?: string): readonly string[] {
  if (current && !DEFAULT_HTML_TAG_OPTIONS.includes(current as DefaultHtmlTag)) {
    return [current, ...DEFAULT_HTML_TAG_OPTIONS];
  }
  return DEFAULT_HTML_TAG_OPTIONS;
}
