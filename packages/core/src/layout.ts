import { DocumentError } from './errors.js';
import type { AxisSize, Layout, LayoutOverride, SizeValue, Spacing, SpacingBox } from './schema.js';

const TOKEN_REF = /^\{[a-z][a-z0-9]*(?:\.[a-z0-9]+)+\}$/;
const BREAKPOINT_ID = /^[a-z][a-z0-9]*$/;

const JUSTIFY = new Set(['start', 'center', 'end', 'space-between']);
const ALIGN = new Set(['start', 'center', 'end', 'stretch']);

/** Canonical layout: omitted keys dropped, breakpoint ids sorted, nested values cloned. */
export function canonicalizeLayout(layout: Layout | undefined): Layout | undefined {
  if (!layout) return undefined;
  return parseLayout(layout);
}

export function layoutTokenRefs(layout: Layout | undefined): string[] {
  if (!layout) return [];
  return refsInOverride(layout).concat(
    ...Object.values(layout.breakpoints ?? {}).map((override) => refsInOverride(override)),
  );
}

export function parseLayout(value: unknown): Layout {
  if (!isRecord(value)) throw new DocumentError('schema', 'Layout must be an object');
  if ('breakpoints' in value && value.breakpoints !== undefined) {
    const override = { ...value };
    delete override.breakpoints;
    const layout = parseOverride(override, 'Layout');
    layout.breakpoints = parseBreakpoints(value.breakpoints);
    return layout;
  }
  return parseOverride(value, 'Layout');
}

function parseBreakpoints(value: unknown): Record<string, LayoutOverride> {
  if (!isRecord(value)) throw new DocumentError('schema', 'Layout breakpoints must be an object');
  const breakpoints: Record<string, LayoutOverride> = {};
  for (const id of Object.keys(value).sort()) {
    if (!BREAKPOINT_ID.test(id)) {
      throw new DocumentError('schema', `Invalid layout breakpoint "${id}"`);
    }
    const override = value[id];
    if (!isRecord(override)) {
      throw new DocumentError('schema', `Layout breakpoint "${id}" must be an object`);
    }
    if ('breakpoints' in override) {
      throw new DocumentError('schema', `Layout breakpoint "${id}" cannot nest breakpoints`);
    }
    breakpoints[id] = parseOverride(override, `Layout breakpoint "${id}"`);
  }
  if (!Object.keys(breakpoints).length) {
    throw new DocumentError('schema', 'Layout breakpoints must not be empty');
  }
  return breakpoints;
}

function parseOverride(value: Record<string, unknown>, label: string): Layout {
  const layout: Layout = {};
  if (value.position !== undefined) {
    if (value.position !== 'auto' && value.position !== 'absolute') {
      throw new DocumentError('schema', `${label} position must be auto or absolute`);
    }
    layout.position = value.position;
  }
  for (const key of ['x', 'y'] as const) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key])) {
      throw new DocumentError('schema', `${label} ${key} must be a finite number`);
    }
    layout[key] = value[key];
  }
  if ((layout.x !== undefined || layout.y !== undefined) && layout.position !== 'absolute') {
    throw new DocumentError('schema', `${label} x and y require position absolute`);
  }
  if (value.direction !== undefined) {
    if (value.direction !== 'row' && value.direction !== 'column') {
      throw new DocumentError('schema', `${label} direction must be row or column`);
    }
    layout.direction = value.direction;
  }
  if (value.gap !== undefined) layout.gap = parseTokenRef(value.gap, `${label} gap`);
  if (value.padding !== undefined) layout.padding = parseSpacing(value.padding, `${label} padding`);
  if (value.margin !== undefined) layout.margin = parseSpacing(value.margin, `${label} margin`);
  if (value.justify !== undefined) {
    if (typeof value.justify !== 'string' || !JUSTIFY.has(value.justify)) {
      throw new DocumentError('schema', `${label} justify is invalid`);
    }
    layout.justify = value.justify as Layout['justify'];
  }
  if (value.align !== undefined) {
    if (typeof value.align !== 'string' || !ALIGN.has(value.align)) {
      throw new DocumentError('schema', `${label} align is invalid`);
    }
    layout.align = value.align as Layout['align'];
  }
  if (value.wrap !== undefined) {
    if (typeof value.wrap !== 'boolean') {
      throw new DocumentError('schema', `${label} wrap must be a boolean`);
    }
    layout.wrap = value.wrap;
  }
  if (value.width !== undefined) layout.width = parseAxis(value.width, `${label} width`);
  if (value.height !== undefined) layout.height = parseAxis(value.height, `${label} height`);
  const known = new Set([
    'position',
    'x',
    'y',
    'width',
    'height',
    'direction',
    'gap',
    'padding',
    'margin',
    'justify',
    'align',
    'wrap',
    'breakpoints',
  ]);
  for (const key of Object.keys(value)) {
    if (!known.has(key))
      throw new DocumentError('schema', `${label} has unknown property "${key}"`);
  }
  return layout;
}

function parseAxis(value: unknown, label: string): AxisSize {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} must be an object`);
  if (value.mode !== 'hug' && value.mode !== 'fill' && value.mode !== 'fixed') {
    throw new DocumentError('schema', `${label} mode must be hug, fill, or fixed`);
  }
  const axis: AxisSize = { mode: value.mode };
  if (value.size !== undefined) axis.size = parseSize(value.size, `${label} size`);
  if (value.min !== undefined) axis.min = parseSize(value.min, `${label} min`);
  if (value.max !== undefined) axis.max = parseSize(value.max, `${label} max`);
  if (axis.mode === 'fixed' && axis.size === undefined) {
    throw new DocumentError('schema', `${label} fixed size needs a size`);
  }
  if (axis.mode !== 'fixed' && axis.size !== undefined) {
    throw new DocumentError('schema', `${label} ${axis.mode} cannot set size`);
  }
  for (const key of Object.keys(value)) {
    if (key !== 'mode' && key !== 'size' && key !== 'min' && key !== 'max') {
      throw new DocumentError('schema', `${label} has unknown property "${key}"`);
    }
  }
  return axis;
}

function parseSize(value: unknown, label: string): SizeValue {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DocumentError('schema', `${label} must be a positive number of pixels`);
    }
    return value;
  }
  if (typeof value === 'string') return parseTokenRef(value, label);
  if (isRecord(value) && value.unit === '%' && typeof value.value === 'number') {
    if (!Number.isFinite(value.value) || value.value <= 0 || value.value > 100) {
      throw new DocumentError('schema', `${label} percent must be greater than 0 and at most 100`);
    }
    if (Object.keys(value).some((key) => key !== 'unit' && key !== 'value')) {
      throw new DocumentError('schema', `${label} percent has an unknown property`);
    }
    return { unit: '%', value: value.value };
  }
  throw new DocumentError('schema', `${label} must be pixels, a token reference, or a percent`);
}

function parseSpacing(value: unknown, label: string): Spacing {
  if (typeof value === 'string') return parseTokenRef(value, label);
  if (!isRecord(value)) throw new DocumentError('schema', `${label} must be a token or a box`);
  const box: SpacingBox = {};
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    if (value[side] !== undefined) box[side] = parseTokenRef(value[side], `${label} ${side}`);
  }
  if (!Object.keys(box).length) throw new DocumentError('schema', `${label} box is empty`);
  for (const key of Object.keys(value)) {
    if (key !== 'top' && key !== 'right' && key !== 'bottom' && key !== 'left') {
      throw new DocumentError('schema', `${label} has unknown side "${key}"`);
    }
  }
  return box;
}

function parseTokenRef(value: unknown, label: string): string {
  if (typeof value !== 'string' || !TOKEN_REF.test(value)) {
    throw new DocumentError('schema', `${label} must be a token reference like {space.4}`);
  }
  return value;
}

function refsInOverride(layout: LayoutOverride): string[] {
  const refs: string[] = [];
  if (layout.gap) refs.push(tokenPath(layout.gap));
  refs.push(...spacingPaths(layout.padding), ...spacingPaths(layout.margin));
  refs.push(...axisPaths(layout.width), ...axisPaths(layout.height));
  return refs;
}

function spacingPaths(spacing: Spacing | undefined): string[] {
  if (!spacing) return [];
  if (typeof spacing === 'string') return [tokenPath(spacing)];
  return (['top', 'right', 'bottom', 'left'] as const).flatMap((side) => {
    const value = spacing[side];
    return value ? [tokenPath(value)] : [];
  });
}

function axisPaths(axis: AxisSize | undefined): string[] {
  if (!axis) return [];
  return [axis.size, axis.min, axis.max].flatMap((value) =>
    typeof value === 'string' ? [tokenPath(value)] : [],
  );
}

function tokenPath(ref: string): string {
  return ref.slice(1, -1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
