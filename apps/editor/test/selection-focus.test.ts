/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createFrameHost } from '../src/domain/viewport/frame-host';
import { createSelection } from '../src/domain/selection/selection';
import type { ViewportFrame } from '../src/domain/viewport/board';
import { exampleIds as fixtureIds } from '@facadeur/examples';

function mountedFrame(id: string, minWidth: number): ViewportFrame {
  const host = createFrameHost({ id, width: minWidth });
  const column = document.createElement('section');
  column.className = 'viewport-frame';
  document.body.append(column);
  host.mount(column);
  const node = host.contentDocument().createElement('div');
  node.dataset.facadeurNodeUuid = 'node-1';
  host.contentDocument().body.append(node);
  return {
    breakpoint: { id, minWidth },
    host,
    column,
  };
}

describe('selection focus', () => {
  it('paints the clicked frame as primary and the same node elsewhere as secondary', () => {
    const stage = document.createElement('div');
    document.body.append(stage);
    const mobile = mountedFrame(fixtureIds.catalog.breakpoints.phone, 375);
    const tablet = mountedFrame(fixtureIds.catalog.breakpoints.tablet, 768);
    const frames = [mobile, tablet];
    const selection = createSelection({
      stage,
      getScale: () => 1,
      frames: () => frames,
    });

    selection.show('node:node-1', null);
    let boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes.map((box) => box.dataset.focus)).toEqual(['secondary', 'secondary']);
    expect(boxes.every((box) => box.hidden === false)).toBe(true);

    selection.show('node:node-1', fixtureIds.catalog.breakpoints.tablet);
    boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes).toHaveLength(2);
    expect(boxes[0]?.dataset.focus).toBe('secondary');
    expect(boxes[0]?.classList.contains('is-secondary')).toBe(true);
    expect(boxes[1]?.dataset.focus).toBe('primary');
    expect(boxes[1]?.classList.contains('is-primary')).toBe(true);
    expect(boxes[0]?.querySelector('.handle')).toBeTruthy();
    expect(boxes[1]?.querySelector('.handle')).toBeTruthy();

    selection.show('node:node-1', fixtureIds.catalog.breakpoints.phone);
    boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes.map((box) => box.dataset.focus)).toEqual(['primary', 'secondary']);

    selection.show(null, fixtureIds.catalog.breakpoints.tablet);
    boxes = [...stage.querySelectorAll<HTMLElement>('.selection-box')];
    expect(boxes.every((box) => box.hidden)).toBe(true);

    selection.destroy();
    mobile.host.destroy();
    tablet.host.destroy();
    stage.remove();
  });
});
