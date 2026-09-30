import { isColorStyleProperty } from '../color/value.js';
import { isShadowStyleProperty } from '../shadow/value.js';
import { isTypographyStyleProperty } from '../typography/value.js';

const SPACING_PROPERTY =
  /^(gap|rowGap|columnGap|padding|margin|paddingTop|paddingRight|paddingBottom|paddingLeft|paddingInline|paddingBlock|marginTop|marginRight|marginBottom|marginLeft|marginInline|marginBlock|row-gap|column-gap|padding-top|padding-right|padding-bottom|padding-left|padding-inline|padding-block|margin-top|margin-right|margin-bottom|margin-left|margin-inline|margin-block)$/i;

const TYPOGRAPHY_TOKEN_PROPERTIES = new Set(['font']);

export const CSS_ENUM_OPTIONS: Record<string, readonly string[]> = {
  appearance: ['none', 'auto', 'button', 'textfield', 'menulist-button'],
  cursor: [
    'auto',
    'default',
    'pointer',
    'wait',
    'text',
    'move',
    'not-allowed',
    'grab',
    'grabbing',
    'help',
    'crosshair',
  ],
  whiteSpace: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces'],
  resize: ['none', 'both', 'horizontal', 'vertical'],
  overflow: ['visible', 'hidden', 'clip', 'scroll', 'auto'],
  textOverflow: ['clip', 'ellipsis'],
  textTransform: ['none', 'capitalize', 'uppercase', 'lowercase'],
  fontStyle: ['normal', 'italic', 'oblique'],
  fontVariant: ['normal', 'small-caps'],
  textDecoration: ['none', 'underline', 'line-through'],
  pointerEvents: ['auto', 'none'],
  userSelect: ['auto', 'none', 'text', 'all'],
  objectFit: ['fill', 'contain', 'cover', 'none', 'scale-down'],
  display: [
    'block',
    'inline',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'none',
    'contents',
  ],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  visibility: ['visible', 'hidden', 'collapse'],
};

export type StyleDeclarationKind =
  'color' | 'shadow' | 'typography' | 'typography-token' | 'spacing' | 'enum' | 'text';

export type StyleDeclarationGroup =
  'layout' | 'size' | 'spacing' | 'surface' | 'typography' | 'effects' | 'visibility' | 'advanced';

export function styleDeclarationKind(property: string): StyleDeclarationKind {
  const name = normalizeProperty(property);
  if (isColorStyleProperty(name)) return 'color';
  if (isShadowStyleProperty(name)) return 'shadow';
  if (TYPOGRAPHY_TOKEN_PROPERTIES.has(name)) return 'typography-token';
  if (CSS_ENUM_OPTIONS[name] || CSS_ENUM_OPTIONS[toCamel(name)]) return 'enum';
  if (isTypographyStyleProperty(name)) return 'typography';
  if (SPACING_PROPERTY.test(name)) return 'spacing';
  return 'text';
}

export function enumOptionsForProperty(property: string): readonly string[] | null {
  const direct = CSS_ENUM_OPTIONS[property];
  if (direct) return direct;
  const camel = toCamel(property);
  return CSS_ENUM_OPTIONS[camel] ?? null;
}

export function enumOptionLabel(property: string, value: string): string {
  const name = normalizeProperty(property);
  return ENUM_OPTION_LABELS[name]?.[value] ?? value;
}

/** Return the stable inspector group for a CSS declaration. */
export function styleDeclarationGroup(property: string): StyleDeclarationGroup {
  const name = normalizeProperty(property);
  if (LAYOUT_PROPERTIES.has(name)) return 'layout';
  if (SIZE_PROPERTIES.has(name)) return 'size';
  if (SPACING_GROUP_PROPERTY.test(name)) return 'spacing';
  if (SURFACE_PROPERTIES.test(name)) return 'surface';
  if (isTypographyStyleProperty(name) || name === 'color' || name === 'text-align') {
    return 'typography';
  }
  if (isShadowStyleProperty(name) || EFFECTS_PROPERTIES.test(name)) return 'effects';
  if (
    VISIBILITY_PROPERTIES.test(name) ||
    CSS_ENUM_OPTIONS[name] ||
    CSS_ENUM_OPTIONS[toCamel(name)]
  ) {
    return 'visibility';
  }
  return 'advanced';
}

export function stylePropertyLabel(property: string): string {
  const trimmed = property.trim();
  if (!trimmed) return property;
  const shortLabel = SHORT_PROPERTY_LABELS[normalizeProperty(trimmed)];
  if (shortLabel) return shortLabel;
  const readable = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return readable.charAt(0).toUpperCase() + readable.slice(1);
}

const LAYOUT_PROPERTIES = new Set([
  'align-content',
  'align-items',
  'align-self',
  'box-sizing',
  'display',
  'flex',
  'flex-basis',
  'flex-direction',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'flex-wrap',
  'gap',
  'grid',
  'grid-area',
  'grid-column',
  'grid-row',
  'grid-template-columns',
  'grid-template-rows',
  'justify-content',
  'justify-items',
  'justify-self',
  'order',
]);

const SIZE_PROPERTIES = new Set([
  'aspect-ratio',
  'height',
  'inset',
  'inset-block',
  'inset-block-end',
  'inset-block-start',
  'inset-inline',
  'inset-inline-end',
  'inset-inline-start',
  'left',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'position',
  'right',
  'top',
  'bottom',
  'width',
  'z-index',
]);

const SPACING_GROUP_PROPERTY = /^(gap|margin|padding)(-|$)/;
const SURFACE_PROPERTIES =
  /^(background|border|outline|fill|stroke)(-|$)|^(background|border|outline|fill|stroke)$/;
const EFFECTS_PROPERTIES =
  /^(filter|mix-blend-mode|opacity|transform|transition|animation|backdrop-filter)(-|$)|^(filter|mix-blend-mode|opacity|transform|transition|animation|backdrop-filter)$/;
const VISIBILITY_PROPERTIES =
  /^(appearance|cursor|overflow|pointer-events|resize|text-overflow|user-select|visibility|white-space)(-|$)|^(appearance|cursor|overflow|pointer-events|resize|text-overflow|user-select|visibility|white-space)$/;

const SHORT_PROPERTY_LABELS: Record<string, string> = {
  background: 'Background',
  'background-color': 'Background',
  'border-radius': 'Radius',
  color: 'Text color',
  'font-family': 'Font family',
  'font-size': 'Font size',
  'font-style': 'Font style',
  'font-weight': 'Font weight',
  'line-height': 'Line height',
  'letter-spacing': 'Letter spacing',
  opacity: 'Opacity',
  'text-align': 'Align',
  'text-decoration': 'Decoration',
  'text-transform': 'Transform',
  appearance: 'Native appearance',
};

const ENUM_OPTION_LABELS: Record<string, Record<string, string>> = {
  display: {
    none: 'None (removes space)',
  },
  visibility: {
    visible: 'Visible',
    hidden: 'Hidden (keeps space)',
    collapse: 'Collapse',
  },
};

function toCamel(property: string): string {
  return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function normalizeProperty(property: string): string {
  return property
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}
