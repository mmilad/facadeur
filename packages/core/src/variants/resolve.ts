import { DocumentError } from '../document/errors.js';
import { mergeChildFieldOverrides } from '../document/child-fields.js';
import {
  isVariantAxis,
  type DocumentFile,
  type Layout,
  type LayoutOverride,
  type NestedNode,
  type StyleBlock,
  type StyleChild,
  type StyleLayer,
  type VariantNodeOverride,
  type VariantPreset,
} from '../document/schema.js';
import { removeNamedVariantLayer } from './style-layers.js';

/** Return named overlay variants without exposing the legacy axis definitions. */
export function variantPresets(document: DocumentFile): VariantPreset[] {
  return (document.variants ?? []).filter(
    (variant): variant is VariantPreset => !isVariantAxis(variant),
  );
}

/**
 * Resolve a named component variant into a renderable document.
 * The source document is never mutated: `removed` only affects the returned tree.
 */
export function resolveVariantDocument(
  document: DocumentFile,
  name = 'default',
  options: { preserveStyleLayers?: boolean } = {},
): DocumentFile {
  if (name === 'default') return structuredClone(document);
  const preset = variantPresets(document).find((variant) => variant.name === name);
  if (!preset) return structuredClone(document);

  const next = structuredClone(document);
  const overrides = preset.overrides ?? {};
  const fields = new Map((next.fields ?? []).map((field) => [field.name, field]));
  for (const [fieldName, value] of Object.entries(overrides.fields ?? {})) {
    const field = fields.get(fieldName);
    if (!field) {
      throw new DocumentError(
        'unknown-field',
        `Variant "${name}" overrides unknown field "${fieldName}" on "${document.id}"`,
      );
    }
    field.default = value;
  }
  for (const fieldName of overrides.unsetFields ?? []) {
    const field = fields.get(fieldName);
    if (!field) {
      throw new DocumentError(
        'unknown-field',
        `Variant "${name}" unsets unknown field "${fieldName}" on "${document.id}"`,
      );
    }
    delete field.default;
  }

  const removed = new Set(overrides.removed ?? []);
  next.root = applyNode(next.root, overrides.nodes ?? {}, removed, overrides.insertions ?? []);
  const styles = options.preserveStyleLayers
    ? structuredClone(next.styles)
    : resolveNamedVariantStyles(next.styles, name);
  next.styles = pruneStyleChildren(mergeStyleBlock(styles, overrides.styles), next.root);
  return next;
}

/** Merge a sparse style block stored directly on a named preset. */
function mergeStyleBlock(
  target: StyleBlock | undefined,
  source: StyleBlock | undefined,
): StyleBlock | undefined {
  if (!source) return target;
  const next = target ? structuredClone(target) : {};
  mergeStyleLayer(next, source);

  for (const [axis, values] of Object.entries(source.variants ?? {})) {
    const variants = (next.variants ??= {});
    const targetValues = (variants[axis] ??= {});
    for (const [value, layer] of Object.entries(values)) {
      const existing = (targetValues[value] ??= {});
      mergeStyleLayer(existing, layer);
    }
  }
  for (const [breakpoint, layer] of Object.entries(source.breakpoints ?? {})) {
    const breakpoints = (next.breakpoints ??= {});
    const existing = (breakpoints[breakpoint] ??= {});
    mergeStyleLayer(existing, layer);
  }
  for (const [id, child] of Object.entries(source.children ?? {})) {
    const children = (next.children ??= {});
    const existing = (children[id] ??= {});
    mergeStyleChild(existing, child);
  }
  return next;
}

function mergeStyleChild(target: StyleChild, source: StyleChild): void {
  mergeStyleLayer(target, source);
  for (const [axis, values] of Object.entries(source.variants ?? {})) {
    const variants = (target.variants ??= {});
    const targetValues = (variants[axis] ??= {});
    for (const [value, layer] of Object.entries(values)) {
      const existing = (targetValues[value] ??= {});
      mergeStyleLayer(existing, layer);
    }
  }
  for (const [breakpoint, layer] of Object.entries(source.breakpoints ?? {})) {
    const breakpoints = (target.breakpoints ??= {});
    const existing = (breakpoints[breakpoint] ??= {});
    mergeStyleLayer(existing, layer);
  }
}

/** A removed node must not leave a style child behind in the materialized view. */
function pruneStyleChildren(
  styles: StyleBlock | undefined,
  root: NestedNode,
): StyleBlock | undefined {
  if (!styles?.children) return styles;
  const nodeIds = new Set<string>();
  const visit = (node: NestedNode): void => {
    nodeIds.add(node.id);
    if (node.type === 'frame') {
      for (const child of node.children ?? []) visit(child);
    }
  };
  visit(root);
  for (const id of Object.keys(styles.children)) {
    if (!nodeIds.has(id)) delete styles.children[id];
  }
  if (!Object.keys(styles.children).length) delete styles.children;
  return styles;
}

/**
 * Named presets reuse the style block's sparse variant layers under the reserved
 * `variant` axis. Resolve that layer into the base styles for a materialized
 * document, then remove the axis so the result validates as a standalone view.
 */
function resolveNamedVariantStyles(
  styles: StyleBlock | undefined,
  name: string,
): StyleBlock | undefined {
  if (!styles) return undefined;
  const next = structuredClone(styles);
  const rootLayer = next.variants?.variant?.[name];
  if (rootLayer) mergeStyleLayer(next, rootLayer);
  for (const child of Object.values(next.children ?? {})) {
    const childLayer = child.variants?.variant?.[name];
    if (childLayer) mergeStyleLayer(child, childLayer);
  }
  removeNamedVariantLayer(next);
  return next;
}

function mergeStyleLayer(target: StyleBlock | StyleChild, source: StyleLayer): void {
  if (source.declarations) {
    target.declarations = { ...(target.declarations ?? {}), ...source.declarations };
  }
  if (source.states) {
    const states = { ...(target.states ?? {}) };
    for (const [name, declarations] of Object.entries(source.states)) {
      if (!declarations) continue;
      const state = name as keyof NonNullable<StyleChild['states']>;
      states[state] = { ...(states[state] ?? {}), ...declarations };
    }
    target.states = states;
  }
}

function applyNode(
  node: NestedNode,
  nodeOverrides: Record<string, VariantNodeOverride>,
  removed: Set<string>,
  insertions: readonly { parent: string; index?: number; node: unknown }[],
  path = node.id,
  allowRemoved = false,
): NestedNode {
  if (!allowRemoved && matchesTarget(removed, node.id, path)) {
    throw new DocumentError(
      'schema',
      `Variant cannot remove the root or an inserted node "${path}"`,
    );
  }

  let next = structuredClone(node);
  if (next.type === 'frame') {
    const children = (next.children ?? [])
      .filter((child) => !matchesTarget(removed, child.id, joinPath(path, child.id)))
      .map((child) =>
        applyNode(child, nodeOverrides, removed, insertions, joinPath(path, child.id)),
      );
    const additions = insertions.filter((insertion) =>
      matchesTarget(new Set([insertion.parent]), next.id, path),
    );
    for (const insertion of additions) {
      const child = insertion.node as NestedNode;
      if (!child || typeof child !== 'object' || typeof child.id !== 'string') {
        throw new DocumentError('schema', `Variant insertion under "${path}" is invalid`);
      }
      const childPath = joinPath(path, child.id);
      const index = insertion.index ?? children.length;
      if (index < 0 || index > children.length) {
        throw new DocumentError(
          'schema',
          `Variant insertion under "${path}" has an invalid index ${index}`,
        );
      }
      children.splice(
        index,
        0,
        applyNode(child, nodeOverrides, removed, insertions, childPath, true),
      );
    }
    next.children = children.length ? children : undefined;
  }

  const override = nodeOverrides[path] ?? nodeOverrides[next.id];
  if (override) next = applyOverride(next, override);
  return next;
}

function matchesTarget(targets: ReadonlySet<string>, id: string, path: string): boolean {
  return targets.has(id) || targets.has(path);
}

function joinPath(parent: string, id: string): string {
  return `${parent}.${id}`;
}

function applyOverride(node: NestedNode, override: VariantNodeOverride): NestedNode {
  const next = structuredClone(node);
  if (next.type === 'instance') {
    if (override.layout) next.layout = mergeLayout(next.layout, override.layout);
    if (override.fields) next.fields = { ...(next.fields ?? {}), ...override.fields };
    if (override.childFields) {
      next.childFields = mergeChildFieldOverrides(next.childFields, override.childFields);
    }
    if (override.fieldBindings) {
      next.fieldBindings = { ...(next.fieldBindings ?? {}), ...override.fieldBindings };
    }
    if (override.variants) next.variants = { ...(next.variants ?? {}), ...override.variants };
    if (override.variantRules) next.variantRules = structuredClone(override.variantRules);
    if (override.displayOn) next.displayOn = structuredClone(override.displayOn);
    applyUnset(next, override.unset);
    return next;
  }
  if (override.repeat && next.type === 'frame') next.repeat = structuredClone(override.repeat);
  if (override.text !== undefined && next.type === 'text') next.text = override.text;
  if (override.src !== undefined && next.type === 'image') next.src = override.src;
  if (override.alt !== undefined && next.type === 'image') next.alt = override.alt;
  if (override.attributes) next.attributes = { ...(next.attributes ?? {}), ...override.attributes };
  if (override.layout) next.layout = mergeLayout(next.layout, override.layout);
  if (override.bindings) next.bindings = structuredClone(override.bindings);
  if (override.eventBindings) next.eventBindings = structuredClone(override.eventBindings);
  if (override.style) next.style = { ...(next.style ?? {}), ...override.style };
  if (override.displayOn) next.displayOn = structuredClone(override.displayOn);
  applyUnset(next, override.unset);
  return next;
}

/** Merge sparse node layout overrides without dropping sibling breakpoint layers. */
function mergeLayout(target: Layout | undefined, source: Layout): Layout {
  const next = structuredClone(target ?? {});
  mergeLayoutLayer(next, source);
  for (const [breakpoint, layer] of Object.entries(source.breakpoints ?? {})) {
    const breakpoints = (next.breakpoints ??= {});
    const existing = (breakpoints[breakpoint] ??= {});
    mergeLayoutLayer(existing, layer);
  }
  return next;
}

function mergeLayoutLayer(target: Layout | LayoutOverride, source: Layout | LayoutOverride): void {
  for (const [key, value] of Object.entries(source)) {
    if (key === 'breakpoints') continue;
    (target as Record<string, unknown>)[key] = structuredClone(value);
  }
}

function applyUnset(node: NestedNode, paths: readonly string[] | undefined): void {
  for (const path of paths ?? []) {
    const [property, key, ...rest] = path.split('.');
    if (!property) continue;
    if (property === 'childFields' && node.type === 'instance') {
      const childFields = structuredClone(node.childFields ?? {});
      if (!key) {
        node.childFields = undefined;
      } else if (key && !rest.length) {
        delete childFields[key];
        node.childFields = Object.keys(childFields).length ? childFields : undefined;
      } else if (key && rest.length === 1 && rest[0]) {
        const fields = { ...(childFields[key] ?? {}) };
        delete fields[rest[0]];
        if (Object.keys(fields).length) childFields[key] = fields;
        else delete childFields[key];
        node.childFields = Object.keys(childFields).length ? childFields : undefined;
      }
      continue;
    }
    if (rest.length > 0) continue;
    if (property === 'fields' && node.type === 'instance') {
      if (key) {
        const fields = { ...(node.fields ?? {}) };
        delete fields[key];
        node.fields = Object.keys(fields).length ? fields : undefined;
      } else node.fields = undefined;
    } else if (property === 'fieldBindings' && node.type === 'instance') {
      if (key) {
        const fieldBindings = { ...(node.fieldBindings ?? {}) };
        delete fieldBindings[key];
        node.fieldBindings = Object.keys(fieldBindings).length ? fieldBindings : undefined;
      } else node.fieldBindings = undefined;
    } else if (property === 'variants' && node.type === 'instance') {
      if (key) {
        const variants = { ...(node.variants ?? {}) };
        delete variants[key];
        node.variants = Object.keys(variants).length ? variants : undefined;
      } else node.variants = undefined;
    } else if (property === 'attributes' && node.type !== 'instance') {
      if (key) {
        const attributes = { ...(node.attributes ?? {}) };
        delete attributes[key];
        node.attributes = Object.keys(attributes).length ? attributes : undefined;
      } else node.attributes = undefined;
    } else if (property === 'style' && node.type !== 'instance') {
      if (key) {
        const style = { ...(node.style ?? {}) };
        delete style[key];
        node.style = Object.keys(style).length ? style : undefined;
      } else node.style = undefined;
    } else if (property === 'text' && node.type === 'text') delete node.text;
    else if (property === 'src' && node.type === 'image') delete node.src;
    else if (property === 'alt' && node.type === 'image') delete node.alt;
    else if (property === 'repeat' && node.type === 'frame') delete node.repeat;
    else if (property === 'layout') delete node.layout;
    else if (property === 'bindings' && node.type !== 'instance') delete node.bindings;
    else if (property === 'eventBindings' && node.type !== 'instance') delete node.eventBindings;
    else if (property === 'displayOn') delete node.displayOn;
    else if (property === 'variantRules' && node.type === 'instance') delete node.variantRules;
  }
}
