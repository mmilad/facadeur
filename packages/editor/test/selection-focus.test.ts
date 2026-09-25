/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import type { DomRenderer } from '@facadeur/renderer-dom';
import type { StyleEngine } from '@facadeur/style-engine';
import { createFrameHost } from '../src/frame-host.js';
import { createSelection } from '../src/selection.js';
import type { ViewportFrame } from '../src/viewports.js';

function mountedFrame(id: string, minWidth: number): ViewportFrame {
  const host = createFrameHost({ id, width: minWidth });
  const column = document.createElement('section');
  column.className = 'viewport-frame';
  document.body.append(column);
  host.mount(column);
  const node = host.contentDocument().createElement('div');
  node.dataset.id = 'heading';
  host.contentDocument().body.append(node);
  return {
    breakpoint: { id, minWidth },
    host,
    renderer: { destroy() {} } as DomRenderer,
    styles: { destroy() {} } as StyleEngine,
  };
}

describe('selection focus', () => {
  it('paints the clicked frame as primary and the same node elsewhere as secondary', () => {
    const stage = document.createElement('div');
    document.body.append(stage);
    const mobile = mountedFrame('mobile', 375);
    const tablet = mountedFrame('tablet', 768);
    const frames = [mobile, tablet];
    const selection = createSelection({
      stage,
      getScale: () => 1,
      frames: () => frames,
    });

    selection.show('heading', null);
    let boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes.map((box) => box.dataset.focus)).toEqual(['secondary', 'secondary']);
    expect(boxes.every((box) => box.hidden === false)).toBe(true);

    selection.show('heading', 'tablet');
    boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes).toHaveLength(2);
    expect(boxes[0]?.dataset.focus).toBe('secondary');
    expect(boxes[0]?.classList.contains('is-secondary')).toBe(true);
    expect(boxes[1]?.dataset.focus).toBe('primary');
    expect(boxes[1]?.classList.contains('is-primary')).toBe(true);
    expect(boxes[0]?.querySelector('.handle')).toBeTruthy();
    expect(boxes[1]?.querySelector('.handle')).toBeTruthy();

    selection.show('heading', 'mobile');
    boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes.map((box) => box.dataset.focus)).toEqual(['primary', 'secondary']);

    selection.show(null, 'tablet');
    boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes.every((box) => box.hidden)).toBe(true);

    selection.destroy();
    mobile.host.destroy();
    tablet.host.destroy();
    stage.remove();
  });
});
