import { describe, expect, it } from 'vitest';
import { overlayBox, pointInFrame } from '../src/geometry.js';

describe('overlay geometry', () => {
  it('maps an iframe-local box into stage coordinates at scale 1', () => {
    expect(
      overlayBox({
        element: { left: 10, top: 20, width: 30, height: 40 },
        frame: { left: 100, top: 40 },
        stage: { left: 0, top: 0 },
        scale: 1,
      }),
    ).toEqual({ x: 110, y: 60, width: 30, height: 40 });
  });

  it('keeps iframe CSS pixels when the stage is scaled', () => {
    // Stage at (10, 20), scale 0.5. A frame whose local origin is (100, 40)
    // sits at screen (60, 40). The node is 8,4 inside the iframe.
    expect(
      overlayBox({
        element: { left: 8, top: 4, width: 20, height: 10 },
        frame: { left: 60, top: 40 },
        stage: { left: 10, top: 20 },
        scale: 0.5,
      }),
    ).toEqual({ x: 108, y: 44, width: 20, height: 10 });
  });

  it('places the same node in every frame by the frame offset', () => {
    const element = { left: 12, top: 6, width: 80, height: 24 };
    const stage = { left: 0, top: 0 };
    const mobile = overlayBox({
      element,
      frame: { left: 40, top: 20 },
      stage,
      scale: 1,
    });
    const desktop = overlayBox({
      element,
      frame: { left: 40 + 375 + 72, top: 20 },
      stage,
      scale: 1,
    });
    expect(desktop.x - mobile.x).toBe(375 + 72);
    expect(desktop.y).toBe(mobile.y);
    expect(desktop.width).toBe(mobile.width);
  });

  it('treats a non-positive scale as 1', () => {
    expect(
      overlayBox({
        element: { left: 0, top: 0, width: 10, height: 10 },
        frame: { left: 5, top: 5 },
        stage: { left: 0, top: 0 },
        scale: 0,
      }),
    ).toEqual({ x: 5, y: 5, width: 10, height: 10 });
  });

  it('converts a pointer over a scaled iframe into iframe CSS pixels', () => {
    // Visual width 187.5 is a 375 CSS-pixel frame at scale 0.5.
    const frame = { left: 60, top: 40, width: 187.5, height: 100 };
    expect(pointInFrame({ clientX: 60 + 93.75, clientY: 40 + 25, frame, scale: 0.5 })).toEqual({
      x: 187.5,
      y: 50,
    });
    expect(pointInFrame({ clientX: 59, clientY: 40, frame, scale: 0.5 })).toBeNull();
    expect(pointInFrame({ clientX: 60 + 187.5, clientY: 40, frame, scale: 0.5 })).toBeNull();
  });
});
