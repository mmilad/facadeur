import { DocumentError } from './errors.js';
import {
  isVariantAxis,
  type DocumentFile,
  type NestedNode,
  type VariantNodeOverride,
  type VariantPreset,
} from './schema.js';

/** Return named overlay variants without exposing the legacy axis definitions. */
export function variantPresets(document: DocumentFile): VariantPreset[] {
  return (document.variants ?? []).filter((variant): variant is VariantPreset => !isVariantAxis(variant));
}

/**
 * Resolve a named component variant into a renderable document.
 * The source document is never mutated: `removed` only affects the returned tree.
 */
export function resolveVariantDocument(
  document: DocumentFile,
  name = 'default',
): DocumentFile {
  const preset = variantPresets(document).find((variant) => variant.name === name);
  if (!preset?.overrides) return structuredClone(document);

  const next = structuredClone(document);
  const overrides = preset.overrides;
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

  const removed = new Set(overrides.removed ?? []);
  next.root = applyNode(next.root, overrides.nodes ?? {}, removed, overrides.insertions ?? []);
  return next;
}

function applyNode(
  node: NestedNode,
  nodeOverrides: Record<string, VariantNodeOverride>,
  removed: Set<string>,
  insertions: readonly { parent: string; index?: number; node: unknown }[],
): NestedNode {
  if (removed.has(node.id)) {
    throw new DocumentError('schema', `Variant cannot remove the root or an inserted node "${node.id}"`);
  }

  let next = structuredClone(node);
  if (next.type === 'frame') {
    const children = (next.children ?? [])
      .filter((child) => !removed.has(child.id))
      .map((child) => applyNode(child, nodeOverrides, removed, insertions));
    const additions = insertions.filter((insertion) => insertion.parent === next.id);
    for (const insertion of additions) {
      const child = insertion.node as NestedNode;
      if (!child || typeof child !== 'object' || typeof child.id !== 'string') {
        throw new DocumentError('schema', `Variant insertion under "${next.id}" is invalid`);
      }
      if (removed.has(child.id)) continue;
      const index = insertion.index ?? children.length;
      if (index < 0 || index > children.length) {
        throw new DocumentError(
          'schema',
          `Variant insertion under "${next.id}" has an invalid index ${index}`,
        );
      }
      children.splice(index, 0, applyNode(child, nodeOverrides, removed, insertions));
    }
    next.children = children.length ? children : undefined;
  }

  const override = nodeOverrides[next.id];
  if (override) next = applyOverride(next, override);
  return next;
}

function applyOverride(node: NestedNode, override: VariantNodeOverride): NestedNode {
  const next = structuredClone(node);
  if (next.type === 'instance') {
    if (override.fields) next.fields = { ...(next.fields ?? {}), ...override.fields };
    if (override.variants) next.variants = { ...(next.variants ?? {}), ...override.variants };
    return next;
  }
  if (override.repeat && next.type === 'frame') next.repeat = structuredClone(override.repeat);
  if (override.text !== undefined && next.type === 'text') next.text = override.text;
  if (override.src !== undefined && next.type === 'image') next.src = override.src;
  if (override.alt !== undefined && next.type === 'image') next.alt = override.alt;
  if (override.attributes) next.attributes = { ...(next.attributes ?? {}), ...override.attributes };
  if (override.layout) next.layout = { ...(next.layout ?? {}), ...override.layout };
  if (override.bindings) next.bindings = structuredClone(override.bindings);
  if (override.eventBindings) next.eventBindings = structuredClone(override.eventBindings);
  if (override.style) next.style = { ...(next.style ?? {}), ...override.style };
  if (override.displayOn) next.displayOn = structuredClone(override.displayOn);
  return next;
}
