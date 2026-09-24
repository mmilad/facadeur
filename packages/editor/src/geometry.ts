/**
 * Overlay math for viewport frames.
 *
 * An element's getBoundingClientRect inside an iframe is in that iframe's CSS
 * pixels. It does not include a CSS transform on the iframe in the parent.
 * The iframe element's rect is in parent viewport pixels and does include the
 * stage scale. Stage overlays live in the stage's local box, which the stage
 * transform scales again, so widths stay in iframe CSS pixels.
 */

export interface OverlayBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export function overlayBox(input: {
  /** getBoundingClientRect of the node, in iframe CSS pixels. */
  element: { left: number; top: number; width: number; height: number };
  /** getBoundingClientRect of the iframe, in parent viewport pixels. */
  frame: { left: number; top: number };
  /** getBoundingClientRect of the stage, in parent viewport pixels. */
  stage: { left: number; top: number };
  /** Stage transform scale. Values below or equal to 0 are treated as 1. */
  scale: number;
}): OverlayBox {
  const scale = positiveScale(input.scale);
  return {
    x: (input.frame.left - input.stage.left) / scale + input.element.left,
    y: (input.frame.top - input.stage.top) / scale + input.element.top,
    width: input.element.width,
    height: input.element.height,
  };
}

/**
 * Map a parent-viewport pointer to iframe CSS pixels.
 * Returns null when the pointer is outside the iframe's border box.
 */
export function pointInFrame(input: {
  clientX: number;
  clientY: number;
  frame: { left: number; top: number; width: number; height: number };
  scale: number;
}): Point | null {
  const { clientX, clientY, frame } = input;
  if (
    clientX < frame.left ||
    clientY < frame.top ||
    clientX >= frame.left + frame.width ||
    clientY >= frame.top + frame.height
  ) {
    return null;
  }
  const scale = positiveScale(input.scale);
  return {
    x: (clientX - frame.left) / scale,
    y: (clientY - frame.top) / scale,
  };
}

function positiveScale(scale: number): number {
  return scale > 0 ? scale : 1;
}
