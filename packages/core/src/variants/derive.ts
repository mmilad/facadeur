import { DocumentError } from '../document/errors.js';
import type {
  DocumentFile,
  NestedNode,
  StyleBlock,
  StyleChild,
  StyleLayer,
  VariantNodeOverride,
  VariantOverrides,
  VariantPreset,
} from '../document/schema.js';
import { deriveNodeOverride, sameValue } from './derive-node.js';
import { removeNamedVariantLayer } from './style-layers.js';

/**
 * Derive a sparse preset from a base document and an edited resolved document.
 * This is used by the editor when an active variant is edited: the base tree
 * remains canonical and only the difference is persisted in the preset.
 */
export function deriveVariantPreset(
  base: DocumentFile,
  edited: DocumentFile,
  name: string,
): VariantPreset {
  if (base.id !== edited.id) {
    throw new DocumentError(
      'schema',
      `Cannot derive variant "${name}" across documents "${base.id}" and "${edited.id}"`,
    );
  }

  const baseFields = new Map((base.fields ?? []).map((field) => [field.name, field]));
  const editedFields = new Map((edited.fields ?? []).map((field) => [field.name, field]));
  if (
    baseFields.size !== editedFields.size ||
    [...baseFields.keys()].some((key) => !editedFields.has(key))
  ) {
    throw new DocumentError('schema', `Variant "${name}" cannot change field definitions`);
  }

  const overrides: VariantOverrides = {};
  const fields: Record<string, NonNullable<VariantOverrides['fields']>[string]> = {};
  const unsetFields: string[] = [];
  for (const [fieldName, baseField] of baseFields) {
    const editedField = editedFields.get(fieldName)!;
    if (sameValue(baseField.default, editedField.default)) continue;
    if (editedField.default === undefined) {
      if (baseField.default !== undefined) unsetFields.push(fieldName);
      continue;
    }
    fields[fieldName] = structuredClone(editedField.default);
  }
  if (Object.keys(fields).length) overrides.fields = fields;
  if (unsetFields.length) overrides.unsetFields = unsetFields.sort();

  // The resolved editor document contains the effective named-variant styles.
  // Compare it with the base styles after removing the legacy named layer so
  // the derived preset stores only the sparse direct override.
  const styleBase = base.styles ? structuredClone(base.styles) : undefined;
  if (styleBase) removeNamedVariantLayer(styleBase);
  const styles = deriveStyleBlock(styleBase, edited.styles);
  if (styles) overrides.styles = styles;

  const baseEntries = collectNodes(base.root);
  const editedEntries = collectNodes(edited.root);
  const baseById = new Map(baseEntries.map((entry) => [entry.node.id, entry]));
  const editedById = new Map(editedEntries.map((entry) => [entry.node.id, entry]));
  const moved = new Set<string>();

  for (const entry of baseEntries) {
    const next = editedById.get(entry.node.id);
    if (next && next.path !== entry.path) moved.add(entry.path);
  }
  for (const entry of baseEntries) {
    if (entry.node.type !== 'frame') continue;
    const next = editedById.get(entry.node.id);
    if (!next || next.node.type !== 'frame' || next.path !== entry.path) continue;
    const baseCommon = (entry.node.children ?? [])
      .filter((child) => editedById.get(child.id)?.path === `${entry.path}.${child.id}`)
      .map((child) => child.id);
    const editedCommon = (next.node.children ?? [])
      .filter((child) => baseById.get(child.id)?.path === `${entry.path}.${child.id}`)
      .map((child) => child.id);
    if (!sameValue(baseCommon, editedCommon)) {
      for (const id of new Set([...baseCommon, ...editedCommon])) {
        if (baseById.has(id) && editedById.has(id)) moved.add(`${entry.path}.${id}`);
      }
    }
  }

  const removedCandidates = baseEntries
    .filter((entry) => !editedById.has(entry.node.id) || moved.has(entry.path))
    .map((entry) => entry.path);
  const removed = removedCandidates.filter(
    (path) =>
      !removedCandidates.some((ancestor) => path !== ancestor && path.startsWith(`${ancestor}.`)),
  );
  if (removed.length) overrides.removed = removed;

  const nodes: Record<string, VariantNodeOverride> = {};
  for (const entry of baseEntries) {
    const next = editedById.get(entry.node.id);
    if (!next || next.path !== entry.path || isUnder(entry.path, moved)) continue;
    const override = deriveNodeOverride(entry.node, next.node, name);
    if (override) nodes[entry.path] = override;
  }
  if (Object.keys(nodes).length) overrides.nodes = nodes;

  const insertions: NonNullable<VariantOverrides['insertions']> = [];
  for (const entry of editedEntries) {
    const baseEntry = baseById.get(entry.node.id);
    const needsInsertion = !baseEntry || baseEntry.path !== entry.path || moved.has(baseEntry.path);
    if (!needsInsertion || !entry.parentId) continue;
    const parent = editedById.get(entry.parentId);
    const baseParent = baseById.get(entry.parentId);
    if (!parent || !baseParent || parent.path !== baseParent.path) continue;
    if (isStrictlyUnder(entry.path, moved)) continue;
    const parentNode = parent.node;
    if (parentNode.type !== 'frame') continue;
    const index = (parentNode.children ?? []).findIndex((child) => child.id === entry.node.id);
    const nested = nestedNodeById(edited.root, entry.node.id);
    if (!nested) continue;
    const hasInsertedAncestor = insertions.some((insertion) => {
      const target = insertion.node as NestedNode;
      return containsNode(target, entry.node.id);
    });
    if (hasInsertedAncestor) continue;
    insertions.push({ parent: baseParent.path, index, node: nested });
  }
  if (insertions.length) overrides.insertions = insertions;

  return Object.keys(overrides).length ? { name, overrides } : { name };
}

function deriveStyleBlock(
  base: StyleBlock | undefined,
  edited: StyleBlock | undefined,
): StyleBlock | undefined {
  if (!edited) return undefined;
  const next = deriveStyleOwner(base, edited) as StyleBlock;
  const children: Record<string, StyleChild> = {};
  for (const [id, child] of Object.entries(edited.children ?? {})) {
    const delta = deriveStyleOwner(base?.children?.[id], child) as StyleChild;
    if (Object.keys(delta).length) children[id] = delta;
  }
  if (Object.keys(children).length) next.children = children;
  return Object.keys(next).length ? next : undefined;
}

function deriveStyleOwner(base: StyleChild | undefined, edited: StyleChild): StyleChild {
  const next: StyleChild = {};
  const declarations = declarationDelta(base?.declarations, edited.declarations);
  if (declarations) next.declarations = declarations;

  const states: NonNullable<StyleChild['states']> = {};
  for (const state of ['hover', 'focus-visible', 'disabled'] as const) {
    const delta = declarationDelta(base?.states?.[state], edited.states?.[state]);
    if (delta) states[state] = delta;
  }
  if (Object.keys(states).length) next.states = states;

  const variants: NonNullable<StyleChild['variants']> = {};
  for (const [axis, values] of Object.entries(edited.variants ?? {})) {
    const nextValues: Record<string, StyleLayer> = {};
    for (const [value, layer] of Object.entries(values)) {
      const delta = deriveStyleLayer(base?.variants?.[axis]?.[value], layer);
      if (delta) nextValues[value] = delta;
    }
    if (Object.keys(nextValues).length) variants[axis] = nextValues;
  }
  if (Object.keys(variants).length) next.variants = variants;

  const breakpoints: NonNullable<StyleChild['breakpoints']> = {};
  for (const [id, layer] of Object.entries(edited.breakpoints ?? {})) {
    const delta = deriveStyleLayer(base?.breakpoints?.[id], layer);
    if (delta) breakpoints[id] = delta;
  }
  if (Object.keys(breakpoints).length) next.breakpoints = breakpoints;
  return next;
}

function deriveStyleLayer(
  base: StyleLayer | undefined,
  edited: StyleLayer,
): StyleLayer | undefined {
  const next: StyleLayer = {};
  const declarations = declarationDelta(base?.declarations, edited.declarations);
  if (declarations) next.declarations = declarations;
  const states: NonNullable<StyleChild['states']> = {};
  for (const state of ['hover', 'focus-visible', 'disabled'] as const) {
    const delta = declarationDelta(base?.states?.[state], edited.states?.[state]);
    if (delta) states[state] = delta;
  }
  if (Object.keys(states).length) next.states = states;
  return Object.keys(next).length ? next : undefined;
}

function declarationDelta(
  base: Record<string, string> | undefined,
  edited: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!edited) return undefined;
  const next: Record<string, string> = {};
  for (const [property, value] of Object.entries(edited)) {
    if (!sameValue(base?.[property], value)) next[property] = value;
  }
  return Object.keys(next).length ? next : undefined;
}

interface NodeEntry {
  node: NestedNode;
  path: string;
  parentId: string | null;
}

function collectNodes(root: NestedNode): NodeEntry[] {
  const entries: NodeEntry[] = [];
  function visit(node: NestedNode, path: string, parentId: string | null): void {
    entries.push({ node, path, parentId });
    if (node.type !== 'frame') return;
    for (const child of node.children ?? []) visit(child, `${path}.${child.id}`, node.id);
  }
  visit(root, root.id, null);
  return entries;
}

function nestedNodeById(root: NestedNode, id: string): NestedNode | undefined {
  if (root.id === id) return structuredClone(root);
  if (root.type !== 'frame') return undefined;
  for (const child of root.children ?? []) {
    const found = nestedNodeById(child, id);
    if (found) return found;
  }
  return undefined;
}

function containsNode(root: NestedNode, id: string): boolean {
  return Boolean(nestedNodeById(root, id));
}

function isUnder(path: string, ancestors: ReadonlySet<string>): boolean {
  for (const ancestor of ancestors) {
    if (path === ancestor || path.startsWith(`${ancestor}.`)) return true;
  }
  return false;
}

function isStrictlyUnder(path: string, ancestors: ReadonlySet<string>): boolean {
  for (const ancestor of ancestors) {
    if (path.startsWith(`${ancestor}.`)) return true;
  }
  return false;
}
