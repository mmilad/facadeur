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
  display: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'none', 'contents'],
  position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  visibility: ['visible', 'hidden', 'collapse'],
};

export type StyleDeclarationKind =
  'color' | 'shadow' | 'typography' | 'typography-token' | 'spacing' | 'enum' | 'text';

export function styleDeclarationKind(property: string): StyleDeclarationKind {
  const name = property.trim();
  if (isColorStyleProperty(name)) return 'color';
  if (isShadowStyleProperty(name)) return 'shadow';
  if (TYPOGRAPHY_TOKEN_PROPERTIES.has(name)) return 'typography-token';
  if (isTypographyStyleProperty(name)) return 'typography';
  if (SPACING_PROPERTY.test(name)) return 'spacing';
  if (CSS_ENUM_OPTIONS[name] || CSS_ENUM_OPTIONS[toCamel(name)]) return 'enum';
  return 'text';
}

export function enumOptionsForProperty(property: string): readonly string[] | null {
  const direct = CSS_ENUM_OPTIONS[property];
  if (direct) return direct;
  const camel = toCamel(property);
  return CSS_ENUM_OPTIONS[camel] ?? null;
}

function toCamel(property: string): string {
  return property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
