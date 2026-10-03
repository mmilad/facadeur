/** HTML attributes whose React name differs, or that React treats as boolean. */
const REACT_NAME: Record<string, string> = {
  acceptcharset: 'acceptCharset',
  accesskey: 'accessKey',
  allowfullscreen: 'allowFullScreen',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  charset: 'charSet',
  class: 'className',
  classid: 'classID',
  colspan: 'colSpan',
  contenteditable: 'contentEditable',
  contextmenu: 'contextMenu',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  enctype: 'encType',
  enterkeyhint: 'enterKeyHint',
  fetchpriority: 'fetchPriority',
  for: 'htmlFor',
  formaction: 'formAction',
  formenctype: 'formEncType',
  formmethod: 'formMethod',
  formnovalidate: 'formNoValidate',
  formtarget: 'formTarget',
  frameborder: 'frameBorder',
  hreflang: 'hrefLang',
  httpequiv: 'httpEquiv',
  inputmode: 'inputMode',
  itemid: 'itemID',
  itemprop: 'itemProp',
  itemref: 'itemRef',
  itemscope: 'itemScope',
  itemtype: 'itemType',
  maxlength: 'maxLength',
  minlength: 'minLength',
  novalidate: 'noValidate',
  playsinline: 'playsInline',
  radiogroup: 'radioGroup',
  readonly: 'readOnly',
  referrerpolicy: 'referrerPolicy',
  rowspan: 'rowSpan',
  spellcheck: 'spellCheck',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
  usemap: 'useMap',
};

/** React props typed as `number`. A numeric document string is emitted as a number literal. */
const NUMERIC_ATTR = new Set([
  'cols',
  'colSpan',
  'maxLength',
  'minLength',
  'rowSpan',
  'rows',
  'size',
  'span',
  'tabIndex',
]);

const BOOLEAN_ATTR = new Set([
  'allowFullScreen',
  'async',
  'autoFocus',
  'autoPlay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formNoValidate',
  'hidden',
  'itemScope',
  'loop',
  'multiple',
  'muted',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'selected',
]);

const VOID = new Set([
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
  'source',
  'track',
  'wbr',
]);

const EVENT_ATTRIBUTE = /^on/i;

export function isVoidTag(tag: string): boolean {
  return VOID.has(tag.toLowerCase());
}

export function isEventAttribute(name: string): boolean {
  return EVENT_ATTRIBUTE.test(name);
}

export function reactAttributeName(name: string): string {
  if (name.startsWith('data-') || name.startsWith('aria-')) return name;
  return REACT_NAME[name.toLowerCase()] ?? name;
}

export function isBooleanAttribute(reactName: string): boolean {
  return BOOLEAN_ATTR.has(reactName);
}

/** Integer document values for React props typed as `number`, otherwise undefined. */
export function numericAttributeCode(reactName: string, value: string): string | undefined {
  if (!NUMERIC_ATTR.has(reactName) || !/^-?\d+$/.test(value)) return undefined;
  return value;
}

/** A boolean HTML attribute is present unless the stored value is the string `false`. */
export function booleanAttributeValue(value: string): boolean {
  return value !== 'false';
}

export function reactStyleName(name: string): string {
  if (name.startsWith('--')) return name;
  return name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
