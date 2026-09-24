import {
  defaultBreakpoints,
  type Breakpoint,
  type DocumentFile,
  type FontFamily,
  type TokenTree,
} from '@facadeur/core';
import type { JsonValue } from '@facadeur/core';

/**
 * Spacing is a 4px grid: the name is the step (`space.4` = 16px), with the
 * usual jumps after 24px (8, 10, 12, 16, 20, 24). `space.gap`, `space.inset`,
 * and `space.stack` are what gap, padding, and margin refer to. Component
 * tokens point at those aliases, never at a raw length.
 *
 * Tiers (`primitive`, `semantic`, `component`) live on the group and inherit.
 * They are metadata for authors; they are not part of the CSS name.
 */
export const defaultTokenTree: TokenTree = {
  color: {
    $type: 'color',
    $extensions: { facadeur: { tier: 'primitive' } },
    neutral: {
      '0': { $value: '#ffffff' },
      '50': { $value: '#f8fafc' },
      '100': { $value: '#f1f5f9' },
      '200': { $value: '#e2e8f0' },
      '400': { $value: '#94a3b8' },
      '600': { $value: '#475569' },
      '900': { $value: '#0f172a' },
    },
    blue: {
      '500': { $value: '#2563eb' },
      '600': { $value: '#1d4ed8' },
    },
    red: {
      '500': { $value: '#dc2626' },
    },
    green: {
      '600': { $value: '#16a34a' },
    },
    bg: {
      $extensions: { facadeur: { tier: 'semantic' } },
      canvas: { $value: '{color.neutral.0}' },
      muted: { $value: '{color.neutral.50}' },
      inverse: { $value: '{color.neutral.900}' },
    },
    text: {
      $extensions: { facadeur: { tier: 'semantic' } },
      primary: { $value: '{color.neutral.900}' },
      secondary: { $value: '{color.neutral.600}' },
      inverse: { $value: '{color.neutral.0}' },
    },
    border: {
      $extensions: { facadeur: { tier: 'semantic' } },
      default: { $value: '{color.neutral.200}' },
    },
    accent: {
      $extensions: { facadeur: { tier: 'semantic' } },
      default: { $value: '{color.blue.500}' },
      hover: { $value: '{color.blue.600}' },
    },
    danger: {
      $extensions: { facadeur: { tier: 'semantic' } },
      default: { $value: '{color.red.500}' },
    },
    success: {
      $extensions: { facadeur: { tier: 'semantic' } },
      default: { $value: '{color.green.600}' },
    },
  },
  space: {
    $type: 'dimension',
    $description:
      '4px spacing grid. gap, padding, and margin use space.gap, space.inset, and space.stack.',
    $extensions: { facadeur: { tier: 'primitive' } },
    '0': { $value: '0' },
    '1': { $value: '4px' },
    '2': { $value: '8px' },
    '3': { $value: '12px' },
    '4': { $value: '16px' },
    '5': { $value: '20px' },
    '6': { $value: '24px' },
    '8': { $value: '32px' },
    '10': { $value: '40px' },
    '12': { $value: '48px' },
    '16': { $value: '64px' },
    '20': { $value: '80px' },
    '24': { $value: '96px' },
    gap: {
      $extensions: { facadeur: { tier: 'semantic' } },
      xs: { $value: '{space.1}' },
      sm: { $value: '{space.2}' },
      md: { $value: '{space.4}' },
      lg: { $value: '{space.6}' },
    },
    inset: {
      $extensions: { facadeur: { tier: 'semantic' } },
      xs: { $value: '{space.2}' },
      sm: { $value: '{space.3}' },
      md: { $value: '{space.4}' },
      lg: { $value: '{space.6}' },
    },
    stack: {
      $extensions: { facadeur: { tier: 'semantic' } },
      xs: { $value: '{space.1}' },
      sm: { $value: '{space.2}' },
      md: { $value: '{space.4}' },
      lg: { $value: '{space.8}' },
    },
  },
  radius: {
    $type: 'dimension',
    $extensions: { facadeur: { tier: 'primitive' } },
    none: { $value: '0' },
    sm: { $value: '4px' },
    md: { $value: '8px' },
    lg: { $value: '12px' },
    xl: { $value: '16px' },
    full: { $value: '999px' },
  },
  shadow: {
    $type: 'shadow',
    $extensions: { facadeur: { tier: 'primitive' } },
    sm: {
      $value: {
        color: '#0f172a14',
        offsetX: '0px',
        offsetY: '1px',
        blur: '2px',
        spread: '0px',
      },
    },
    md: {
      $value: {
        color: '#0f172a1f',
        offsetX: '0px',
        offsetY: '8px',
        blur: '24px',
        spread: '0px',
      },
    },
    lg: {
      $value: {
        color: '#0f172a29',
        offsetX: '0px',
        offsetY: '16px',
        blur: '40px',
        spread: '0px',
      },
    },
  },
  font: {
    weight: {
      $type: 'fontWeight',
      $extensions: { facadeur: { tier: 'primitive' } },
      regular: { $value: 400 },
      medium: { $value: 500 },
      semibold: { $value: 600 },
      bold: { $value: 700 },
    },
  },
  type: {
    $type: 'typography',
    $extensions: { facadeur: { tier: 'semantic' } },
    display: typeStep(40, 48, 56, '{font.weight.semibold}', 1.1),
    heading: typeStep(32, 36, 40, '{font.weight.semibold}', 1.2),
    title: typeStep(24, 26, 28, '{font.weight.semibold}', 1.25),
    body: typeStep(16, 17, 18, '{font.weight.regular}', 1.5),
    label: typeStep(14, 14, 15, '{font.weight.medium}', 1.4),
    caption: typeStep(12, 12, 13, '{font.weight.regular}', 1.4),
  },
  button: {
    $extensions: { facadeur: { tier: 'component' } },
    padding: {
      $type: 'dimension',
      x: { $value: '{space.4}' },
      y: { $value: '{space.2}' },
    },
    gap: { $type: 'dimension', $value: '{space.gap.sm}' },
    radius: { $type: 'dimension', $value: '{radius.md}' },
    color: {
      $type: 'color',
      bg: { $value: '{color.accent.default}' },
      text: { $value: '{color.text.inverse}' },
    },
  },
  card: {
    $extensions: { facadeur: { tier: 'component' } },
    padding: { $type: 'dimension', $value: '{space.inset.lg}' },
    gap: { $type: 'dimension', $value: '{space.gap.md}' },
    radius: { $type: 'dimension', $value: '{radius.lg}' },
    shadow: { $type: 'shadow', $value: '{shadow.md}' },
    color: {
      $type: 'color',
      bg: { $value: '{color.bg.canvas}' },
      border: { $value: '{color.border.default}' },
    },
  },
  input: {
    $extensions: { facadeur: { tier: 'component' } },
    padding: {
      $type: 'dimension',
      x: { $value: '{space.3}' },
      y: { $value: '{space.2}' },
    },
    radius: { $type: 'dimension', $value: '{radius.md}' },
    color: {
      $type: 'color',
      bg: { $value: '{color.bg.canvas}' },
      border: { $value: '{color.border.default}' },
      text: { $value: '{color.text.primary}' },
    },
  },
};

export const defaultFonts: FontFamily[] = [
  {
    id: 'sans',
    family: 'Inter',
    weights: [400, 500, 600, 700],
    source: { type: 'google', family: 'Inter' },
    fallbacks: ['system-ui', 'sans-serif'],
  },
];

export interface ProjectTemplate {
  tokens: TokenTree;
  fonts: FontFamily[];
  breakpoints: Breakpoint[];
}

/** Optional starter for a new project: tokens, one family, and the default breakpoints. */
export function createProjectTemplate(): ProjectTemplate {
  return {
    tokens: structuredClone(defaultTokenTree),
    fonts: structuredClone(defaultFonts),
    breakpoints: defaultBreakpoints.map((breakpoint) => ({ ...breakpoint })),
  };
}

/** Same template as a document file, so it can be copied into a project and validated. */
export function createProjectTemplateDocument(): DocumentFile {
  const template = createProjectTemplate();
  return {
    version: 1,
    id: 'project-template',
    name: 'Project template',
    kind: 'atom',
    settings: { breakpoints: template.breakpoints },
    fonts: template.fonts,
    tokens: template.tokens,
    root: { id: 'root', type: 'frame', tag: 'div' },
  };
}

function typeStep(
  mobile: number,
  tablet: number,
  desktop: number,
  weight: string,
  lineHeight: number,
): TokenTree {
  const value: TokenTree = {
    $value: {
      fontFamily: '{font.sans}',
      fontSize: `${mobile}px`,
      fontWeight: weight,
      lineHeight,
      letterSpacing: '0',
    },
  };
  const breakpoints: Record<string, JsonValue> = {};
  if (tablet !== mobile) breakpoints.tablet = { fontSize: `${tablet}px` };
  if (desktop !== tablet) breakpoints.desktop = { fontSize: `${desktop}px` };
  if (Object.keys(breakpoints).length) {
    value.$extensions = { facadeur: { breakpoints } };
  }
  return value;
}
