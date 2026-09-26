/** One step in the session-only Instance → master drill stack. */
export interface DrillStackFrame {
  documentId: string;
  documentName: string;
  instanceNodeId: string;
}

export type DrillParent = Readonly<DrillStackFrame>;

export function pushDrillFrame(
  stack: DrillStackFrame[],
  frame: DrillStackFrame,
): DrillStackFrame[] {
  return [...stack, frame];
}

/** Navigate to a parent crumb; keeps frames below the chosen index. */
export function stackThroughParent(
  stack: readonly DrillStackFrame[],
  index: number,
): DrillStackFrame[] {
  if (index < 0 || index >= stack.length) return [...stack];
  return stack.slice(0, index);
}
