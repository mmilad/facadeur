import {
  defaultNestingRules,
  type DefaultKind,
  type Layout,
  type LayoutOverride,
} from '@facadeur/core';

import type { EditorTool } from './session';

export type InsertTool = 'frame' | 'text' | 'image';

const INSERT_TOOL_LABELS: Record<InsertTool, string> = {
  frame: 'Layer',
  text: 'Text',
  image: 'Image',
};

export function isInsertTool(tool: EditorTool): tool is InsertTool {
  return tool === 'frame' || tool === 'text' || tool === 'image';
}

/** Shell copy for the persistent insert-mode cue (stage chrome only). */
export function insertModeCue(tool: InsertTool): string {
  const label = INSERT_TOOL_LABELS[tool];
  return `${label} tool — click the stage to insert · Esc or V (Select) to exit`;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type LayoutPatch = {
  [Key in keyof LayoutOverride]?: LayoutOverride[Key] | null;
};

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

export function layoutLayer(
  layout: Layout | undefined,
  breakpointId: string | null,
): LayoutOverride {
  if (!breakpointId) return layout ?? {};
  return layout?.breakpoints?.[breakpointId] ?? {};
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

export function toolAllowed(kind: string, tool: InsertTool): boolean {
  const rule = ruleFor(kind);
  return Boolean(rule?.nodeTypes.includes(tool));
}

export function refusalMessage(kind: string, nodeType: string, instanceKind?: string): string {
  if (kind === 'page') return 'Pages can only contain sections or components.';
  if (kind === 'atom') {
    return 'Atoms are single-element documents and cannot contain child nodes.';
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
