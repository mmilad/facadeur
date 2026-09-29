import { DocumentError } from './errors.js';
import {
  isVariantAxis,
  type DocumentFile,
  type NestedNode,
  type VariantNodeOverride,
  type VariantOverrides,
  type VariantPreset,
} from './schema.js';

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
export function resolveVariantDocument(document: DocumentFile, name = 'default'): DocumentFile {
  if (name === 'default') return structuredClone(document);
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
  return next;
}

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

function deriveNodeOverride(
  base: NestedNode,
  edited: NestedNode,
  variantName: string,
): VariantNodeOverride | undefined {
  if (base.type !== edited.type) {
    throw new DocumentError(
      'schema',
      `Variant "${variantName}" cannot change node type "${base.id}"`,
    );
  }
  if (base.type === 'instance') {
    const editedInstance = edited as Extract<NestedNode, { type: 'instance' }>;
    if (base.name !== editedInstance.name) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot override name on node "${base.id}"`,
      );
    }
    if (base.component !== editedInstance.component) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot change component on node "${base.id}"`,
      );
    }
    if (!sameValue(base.expose, editedInstance.expose)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot change instance contracts on node "${base.id}"`,
      );
    }
    const override: VariantNodeOverride = {};
    const fields = mapDelta(
      override,
      'fields',
      base.fields as Record<string, unknown> | undefined,
      editedInstance.fields as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (fields) override.fields = fields as VariantNodeOverride['fields'];
    const fieldBindings = mapDelta(
      override,
      'fieldBindings',
      base.fieldBindings as Record<string, unknown> | undefined,
      editedInstance.fieldBindings as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (fieldBindings) {
      override.fieldBindings = fieldBindings as VariantNodeOverride['fieldBindings'];
    }
    const variants = mapDelta(
      override,
      'variants',
      base.variants as Record<string, unknown> | undefined,
      editedInstance.variants as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (variants) override.variants = variants as Record<string, string>;
    const layout = objectDelta(
      override,
      'layout',
      base.layout as Record<string, unknown> | undefined,
      editedInstance.layout as Record<string, unknown> | undefined,
      variantName,
      base.id,
    );
    if (layout) override.layout = layout as VariantNodeOverride['layout'];
    assignObject(
      override,
      'displayOn',
      base.displayOn,
      editedInstance.displayOn,
      variantName,
      base.id,
    );
    return Object.keys(override).length ? override : undefined;
  }

  const baseElement = base as Exclude<NestedNode, { type: 'instance' }>;
  const editedElement = edited as Exclude<NestedNode, { type: 'instance' }>;
  if (baseElement.name !== editedElement.name) {
    throw new DocumentError(
      'schema',
      `Variant "${variantName}" cannot override name on node "${base.id}"`,
    );
  }
  if (baseElement.tag !== editedElement.tag) {
    throw new DocumentError(
      'schema',
      `Variant "${variantName}" cannot override tag on node "${base.id}"`,
    );
  }
  const override: VariantNodeOverride = {};
  assignScalar(
    override,
    'text',
    baseElement.type === 'text' ? baseElement.text : undefined,
    editedElement.type === 'text' ? editedElement.text : undefined,
    variantName,
    base.id,
  );
  assignScalar(
    override,
    'src',
    baseElement.type === 'image' ? baseElement.src : undefined,
    editedElement.type === 'image' ? editedElement.src : undefined,
    variantName,
    base.id,
  );
  assignScalar(
    override,
    'alt',
    baseElement.type === 'image' ? baseElement.alt : undefined,
    editedElement.type === 'image' ? editedElement.alt : undefined,
    variantName,
    base.id,
  );
  if (baseElement.type === 'frame' && editedElement.type === 'frame') {
    assignObject(
      override,
      'repeat',
      baseElement.repeat,
      editedElement.repeat,
      variantName,
      base.id,
    );
  }
  const attributes = mapDelta(
    override,
    'attributes',
    baseElement.attributes as Record<string, unknown> | undefined,
    editedElement.attributes as Record<string, unknown> | undefined,
    variantName,
    base.id,
  );
  if (attributes) override.attributes = attributes as Record<string, string>;
  const layout = objectDelta(
    override,
    'layout',
    baseElement.layout as Record<string, unknown> | undefined,
    editedElement.layout as Record<string, unknown> | undefined,
    variantName,
    base.id,
  );
  if (layout) override.layout = layout as VariantNodeOverride['layout'];
  assignObject(
    override,
    'bindings',
    baseElement.bindings,
    editedElement.bindings,
    variantName,
    base.id,
  );
  assignObject(
    override,
    'eventBindings',
    baseElement.eventBindings,
    editedElement.eventBindings,
    variantName,
    base.id,
  );
  const style = mapDelta(
    override,
    'style',
    baseElement.style as Record<string, unknown> | undefined,
    editedElement.style as Record<string, unknown> | undefined,
    variantName,
    base.id,
  );
  if (style) override.style = style as Record<string, string>;
  assignObject(
    override,
    'displayOn',
    baseElement.displayOn,
    editedElement.displayOn,
    variantName,
    base.id,
  );
  return Object.keys(override).length ? override : undefined;
}

function assignScalar<T extends keyof VariantNodeOverride>(
  target: VariantNodeOverride,
  key: T,
  base: unknown,
  edited: unknown,
  variantName: string,
  nodeId: string,
): void {
  if (sameValue(base, edited)) return;
  if (edited === undefined) {
    addUnset(target, String(key));
    return;
  }
  (target as Record<string, unknown>)[key] = structuredClone(edited);
}

function assignObject<T extends keyof VariantNodeOverride>(
  target: VariantNodeOverride,
  key: T,
  base: unknown,
  edited: unknown,
  variantName: string,
  nodeId: string,
): void {
  if (sameValue(base, edited)) return;
  if (edited === undefined) {
    addUnset(target, String(key));
    return;
  }
  (target as Record<string, unknown>)[key] = structuredClone(edited);
}

function objectDelta(
  target: VariantNodeOverride,
  property: string,
  base: Record<string, unknown> | undefined,
  edited: Record<string, unknown> | undefined,
  variantName: string,
  nodeId: string,
): Record<string, unknown> | undefined {
  if (sameValue(base, edited)) return undefined;
  if (edited === undefined) {
    addUnset(target, property);
    return undefined;
  }
  const delta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edited)) {
    if (!sameValue(base?.[key], value)) delta[key] = structuredClone(value);
  }
  for (const key of Object.keys(base ?? {})) {
    if (edited[key] === undefined) {
      addUnset(target, `${property}.${key}`);
    }
  }
  return Object.keys(delta).length ? delta : undefined;
}

function mapDelta(
  target: VariantNodeOverride,
  property: string,
  base: Record<string, unknown> | undefined,
  edited: Record<string, unknown> | undefined,
  variantName: string,
  nodeId: string,
): Record<string, unknown> | undefined {
  if (sameValue(base, edited)) return undefined;
  if (edited === undefined) {
    if (base === undefined) return undefined;
    addUnset(target, property);
    return undefined;
  }
  const delta: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(edited)) {
    if (!sameValue(base?.[key], value)) delta[key] = structuredClone(value);
  }
  for (const key of Object.keys(base ?? {})) {
    if (edited[key] === undefined) {
      addUnset(target, `${property}.${key}`);
    }
  }
  return Object.keys(delta).length ? delta : undefined;
}

function addUnset(target: VariantNodeOverride, path: string): void {
  const unset = new Set(target.unset ?? []);
  unset.add(path);
  target.unset = [...unset].sort();
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
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
    if (override.fields) next.fields = { ...(next.fields ?? {}), ...override.fields };
    if (override.fieldBindings) {
      next.fieldBindings = { ...(next.fieldBindings ?? {}), ...override.fieldBindings };
    }
    if (override.variants) next.variants = { ...(next.variants ?? {}), ...override.variants };
    if (override.displayOn) next.displayOn = structuredClone(override.displayOn);
    applyUnset(next, override.unset);
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
  applyUnset(next, override.unset);
  return next;
}

function applyUnset(node: NestedNode, paths: readonly string[] | undefined): void {
  for (const path of paths ?? []) {
    const [property, key, ...rest] = path.split('.');
    if (rest.length > 0 || !property) continue;
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
  }
}
