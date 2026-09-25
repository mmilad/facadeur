import {
  defaultNestingRules,
  findParent,
  isInsideSubtree,
  readTokenTree,
  type AxisSize,
  type DefaultKind,
  type FlatDocument,
  type InsertNode,
  type Layout,
  type LayoutOverride,
  type NodeType,
  type SizeValue,
} from '@facadeur/core';

export type InsertTool = 'frame' | 'text' | 'image';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const OVERRIDE_KEYS = [
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
] as const satisfies readonly (keyof LayoutOverride)[];

export type LayoutPatch = {
  [Key in keyof LayoutOverride]?: LayoutOverride[Key] | null;
};

export type DropZone = 'before' | 'inside' | 'after';

/** Dimension tokens as `{path}` references, for gap, padding, and margin. */
export function dimensionTokenRefs(tree: unknown): string[] {
  const index = readTokenTree(tree);
  return [...index.tokens.values()]
    .filter((token) => token.type === 'dimension')
    .map((token) => `{${token.path}}`)
    .sort((left, right) => left.localeCompare(right));
}

/** Color tokens as `{path}` references for style and token editors. */
export function colorTokenRefs(tree: unknown): string[] {
  const index = readTokenTree(tree);
  return [...index.tokens.values()]
    .filter((token) => token.type === 'color')
    .map((token) => `{${token.path}}`)
    .sort((left, right) => left.localeCompare(right));
}

export function insertDraft(tool: InsertTool, id: string): InsertNode {
  if (tool === 'frame') return { id, type: 'frame', name: 'Frame' };
  if (tool === 'text') return { id, type: 'text', name: 'Text', text: 'Text' };
  return {
    id,
    type: 'image',
    name: 'Image',
    alt: '',
    layout: {
      width: { mode: 'fixed', size: 120 },
      height: { mode: 'fixed', size: 80 },
    },
  };
}

/**
 * Drop into the deepest frame when the pointer is in its center, or when the
 * frame has no children. Near the edge, drop beside that frame in its parent.
 */
export function prefersInsideFrame(
  rect: Box,
  pointer: { x: number; y: number },
  empty: boolean,
): boolean {
  if (empty) return true;
  const insetX = Math.min(24, rect.width * 0.25);
  const insetY = Math.min(24, rect.height * 0.25);
  return (
    pointer.x > rect.left + insetX &&
    pointer.x < rect.left + rect.width - insetX &&
    pointer.y > rect.top + insetY &&
    pointer.y < rect.top + rect.height - insetY
  );
}

/**
 * Frame that receives a drop. `chain` runs from the root to the deepest
 * document node. `draggedId` cannot be dropped into its own subtree.
 * `intoDeepestFrame` is false when the pointer is on the frame's edge.
 */
export function dropParentId(
  doc: FlatDocument,
  chain: readonly string[],
  draggedId: string | null,
  intoDeepestFrame: boolean,
  accepts?: (parentId: string) => boolean,
): string | null {
  const root = doc.nodes[doc.rootId];
  if (!chain.length) return root?.type === 'frame' ? doc.rootId : null;
  const deepest = chain[chain.length - 1];
  if (!deepest) return null;
  const node = doc.nodes[deepest];
  let candidate: string | null;
  if (node?.type === 'frame' && intoDeepestFrame) candidate = deepest;
  else if (node?.type === 'frame') candidate = findParent(doc, deepest)?.id ?? null;
  else candidate = findParent(doc, deepest)?.id ?? null;
  if (!candidate && root?.type === 'frame') candidate = doc.rootId;
  while (candidate) {
    const frame = doc.nodes[candidate];
    const insideDrag = draggedId !== null && isInsideSubtree(doc, draggedId, candidate);
    const allowed = !accepts || accepts(candidate);
    if (!insideDrag && frame?.type === 'frame' && allowed) return candidate;
    candidate = findParent(doc, candidate)?.id ?? null;
  }
  return null;
}

/**
 * The insert line is drawn in stage pixels, which the stage then scales.
 * Thicken the short side so it stays about four screen pixels.
 */
export function emphasizeInsertLine(line: Box, scale: number): Box {
  const thickness = Math.max(4 / (scale > 0 ? scale : 1), 2);
  if (line.height <= line.width) {
    const mid = line.top + line.height / 2;
    return { ...line, top: mid - thickness / 2, height: thickness };
  }
  const mid = line.left + line.width / 2;
  return { ...line, left: mid - thickness / 2, width: thickness };
}

/** Index and insert-line box among siblings already ordered and excluding the dragged node. */
export function placeInParent(input: {
  direction: 'row' | 'column';
  pointer: { x: number; y: number };
  parent: Box;
  siblings: readonly { id: string; rect: Box }[];
}): { index: number; line: Box } {
  const horizontal = input.direction === 'row';
  const pointer = horizontal ? input.pointer.x : input.pointer.y;
  let index = input.siblings.length;
  for (let i = 0; i < input.siblings.length; i += 1) {
    const rect = input.siblings[i]?.rect;
    if (!rect) continue;
    const start = horizontal ? rect.left : rect.top;
    const end = horizontal ? rect.left + rect.width : rect.top + rect.height;
    if (pointer < (start + end) / 2) {
      index = i;
      break;
    }
  }
  return { index, line: lineBox(input, index) };
}

/** True when a move would leave the node where it already is. `index` is after removal. */
export function sameSlot(
  doc: FlatDocument,
  nodeId: string,
  parentId: string,
  index: number,
): boolean {
  const parent = findParent(doc, nodeId);
  if (!parent || parent.id !== parentId) return false;
  return parent.children.indexOf(nodeId) === index;
}

export function layerDropTarget(
  doc: FlatDocument,
  draggedId: string,
  targetId: string,
  zone: DropZone,
): { parentId: string; index: number } | null {
  if (draggedId === targetId) return null;
  if (isInsideSubtree(doc, draggedId, targetId)) return null;
  const spot = layerInsertAt(doc, targetId, zone);
  if (!spot) return null;
  const parent = doc.nodes[spot.parentId];
  if (parent?.type !== 'frame') return null;
  return {
    parentId: spot.parentId,
    index: indexAfterRemoval(parent.children, draggedId, spot.index),
  };
}

/** Where a new node lands relative to a layer row. Index is in the current child list. */
export function layerInsertAt(
  doc: FlatDocument,
  targetId: string,
  zone: DropZone,
): { parentId: string; index: number } | null {
  if (zone === 'inside') {
    const target = doc.nodes[targetId];
    if (target?.type !== 'frame') return null;
    return { parentId: targetId, index: target.children.length };
  }
  const parent = findParent(doc, targetId);
  if (!parent) return null;
  const index = parent.children.indexOf(targetId);
  if (index < 0) return null;
  return { parentId: parent.id, index: zone === 'before' ? index : index + 1 };
}

export function clearLayoutBreakpoint(
  layout: Layout | undefined,
  breakpointId: string,
): Layout | null {
  if (!layout?.breakpoints?.[breakpointId]) return layout ?? null;
  const next = structuredClone(layout);
  const breakpoints = { ...(next.breakpoints ?? {}) };
  delete breakpoints[breakpointId];
  if (Object.keys(breakpoints).length) next.breakpoints = breakpoints;
  else delete next.breakpoints;
  return emptyLayout(next) ? null : next;
}

export function layoutLayer(
  layout: Layout | undefined,
  breakpointId: string | null,
): LayoutOverride {
  if (!breakpointId) return layout ?? {};
  return layout?.breakpoints?.[breakpointId] ?? {};
}

export function writeLayoutFields(
  layout: Layout | undefined,
  breakpointId: string | null,
  patch: LayoutPatch,
): Layout | null {
  const next: Layout = layout ? structuredClone(layout) : {};
  const target: LayoutOverride = breakpointId
    ? { ...(next.breakpoints?.[breakpointId] ?? {}) }
    : next;
  for (const key of OVERRIDE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];
    if (value === null || value === undefined) delete target[key];
    else Object.assign(target, { [key]: value });
  }
  if (breakpointId) {
    const breakpoints = { ...(next.breakpoints ?? {}) };
    if (emptyOverride(target)) delete breakpoints[breakpointId];
    else breakpoints[breakpointId] = target;
    if (Object.keys(breakpoints).length) next.breakpoints = breakpoints;
    else delete next.breakpoints;
  }
  return emptyLayout(next) ? null : next;
}

export function fixedAxis(size: SizeValue, min?: SizeValue, max?: SizeValue): AxisSize {
  return {
    mode: 'fixed',
    size,
    ...(min !== undefined ? { min } : {}),
    ...(max !== undefined ? { max } : {}),
  };
}

function lineBox(
  input: {
    direction: 'row' | 'column';
    parent: Box;
    siblings: readonly { id: string; rect: Box }[];
  },
  index: number,
): Box {
  const thickness = 2;
  const { parent, siblings } = input;
  if (input.direction === 'row') {
    const x = alongEdge(
      index,
      siblings.map((item) => item.rect.left),
      siblings.map((item) => item.rect.left + item.rect.width),
      parent.left + 8,
    );
    return {
      left: x - thickness / 2,
      top: parent.top,
      width: thickness,
      height: Math.max(parent.height, 8),
    };
  }
  const y = alongEdge(
    index,
    siblings.map((item) => item.rect.top),
    siblings.map((item) => item.rect.top + item.rect.height),
    parent.top + 8,
  );
  return {
    left: parent.left,
    top: y - thickness / 2,
    width: Math.max(parent.width, 8),
    height: thickness,
  };
}

function alongEdge(index: number, starts: number[], ends: number[], emptyAt: number): number {
  if (!starts.length) return emptyAt;
  if (index <= 0) return starts[0] ?? emptyAt;
  if (index >= starts.length) return ends[ends.length - 1] ?? emptyAt;
  const prev = ends[index - 1] ?? emptyAt;
  const next = starts[index] ?? emptyAt;
  return (prev + next) / 2;
}

function indexAfterRemoval(
  children: readonly string[],
  draggedId: string,
  rawIndex: number,
): number {
  const without = children.filter((id) => id !== draggedId);
  if (rawIndex >= children.length) return without.length;
  const beforeId = children[rawIndex];
  if (!beforeId || beforeId === draggedId) {
    for (let i = rawIndex; i < children.length; i += 1) {
      const id = children[i];
      if (!id || id === draggedId) continue;
      const index = without.indexOf(id);
      return index === -1 ? without.length : index;
    }
    return without.length;
  }
  const index = without.indexOf(beforeId);
  return index === -1 ? without.length : index;
}

function emptyOverride(value: LayoutOverride): boolean {
  return OVERRIDE_KEYS.every((key) => value[key] === undefined);
}

function emptyLayout(layout: Layout): boolean {
  if (!emptyOverride(layout)) return false;
  return !layout.breakpoints || Object.keys(layout.breakpoints).length === 0;
}

/**
 * A new child is legal when the kind's nesting rule allows that node type
 * under a frame. Instance targets must be a kind the rule lists.
 * The root's own type is not checked here: the root already exists.
 */
export function placementAllowed(
  doc: FlatDocument,
  parentId: string,
  nodeType: NodeType,
  instanceKind?: string,
): boolean {
  const rule = ruleFor(doc.kind);
  if (!rule) return false;
  const parent = doc.nodes[parentId];
  if (parent?.type !== 'frame') return false;
  if (!rule.nodeTypes.includes(nodeType)) return false;
  if (nodeType !== 'instance') return true;
  return Boolean(instanceKind && rule.instanceKinds.includes(instanceKind));
}

export function toolAllowed(kind: string, tool: InsertTool): boolean {
  const rule = ruleFor(kind);
  return Boolean(rule?.nodeTypes.includes(tool));
}

export function refusalMessage(kind: string, nodeType: string, instanceKind?: string): string {
  if (kind === 'page') return 'Pages can only contain sections.';
  if (kind === 'atom' && nodeType === 'instance') {
    return 'Atoms can only contain frames, text, and images.';
  }
  if (nodeType === 'instance' && instanceKind) {
    return `A ${kind} cannot contain an instance of ${instanceKind}.`;
  }
  return `A ${kind} cannot contain a ${nodeType}.`;
}

function ruleFor(kind: string) {
  if (!isDefaultKind(kind)) return undefined;
  return defaultNestingRules[kind];
}

function isDefaultKind(kind: string): kind is DefaultKind {
  return kind === 'atom' || kind === 'component' || kind === 'section' || kind === 'page';
}
