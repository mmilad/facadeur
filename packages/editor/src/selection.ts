import { overlayBox, pointInFrame, type OverlayBox } from './geometry.js';
import { isEditableTarget } from './keyboard.js';
import type { ViewportFrame } from './viewports.js';

const HANDLES = ['nw', 'ne', 'sw', 'se'];

export interface SelectionController {
  /** Move the outline to a rendered id. Does not notify `onSelect`. */
  show: (renderedId: string | null) => void;
  /** Node under the pointer, if it sits inside a viewport frame. */
  hitAt: (clientX: number, clientY: number) => { id: string } | null;
  hoverAt: (clientX: number, clientY: number) => void;
  clearHover: () => void;
  reposition: () => void;
  destroy: () => void;
}

export function createSelection({
  stage,
  getScale,
  frames,
  onSelect,
}: {
  stage: HTMLElement;
  getScale: () => number;
  frames: () => readonly ViewportFrame[];
  /** Click and Escape. `show` does not call this. */
  onSelect?: (renderedId: string | null) => void;
}): SelectionController {
  const overlay = document.createElement('div');
  overlay.className = 'overlay-layer';
  stage.append(overlay);

  const hover = document.createElement('div');
  hover.className = 'hover-box';
  hover.hidden = true;
  overlay.append(hover);

  const selectionBoxes: HTMLDivElement[] = [];
  let selectedId: string | null = null;
  let hoverId: string | null = null;
  let hoverFrameId: string | null = null;

  function show(renderedId: string | null) {
    selectedId = renderedId;
    if (hoverId && hoverId === renderedId) clearHover();
    placeBoxes();
  }

  function hitAt(clientX: number, clientY: number): { id: string } | null {
    const scale = getScale() || 1;
    for (const frame of frames()) {
      const rect = frame.host.element.getBoundingClientRect();
      const local = pointInFrame({ clientX, clientY, frame: rect, scale });
      if (!local) continue;
      const target = frame.host.contentDocument().elementFromPoint(local.x, local.y);
      const node = isHtmlElement(target) ? target.closest('[data-id]') : null;
      if (!isHtmlElement(node) || !node.dataset.id) return null;
      return { id: node.dataset.id };
    }
    return null;
  }

  function hoverAt(clientX: number, clientY: number) {
    const hit = hitAt(clientX, clientY);
    if (!hit || hit.id === selectedId) {
      clearHover();
      return;
    }
    const frame = frameUnder(clientX, clientY);
    hoverId = hit.id;
    hoverFrameId = frame?.host.id ?? null;
    placeHover();
  }

  function clearHover() {
    hoverId = null;
    hoverFrameId = null;
    hover.hidden = true;
  }

  function placeBoxes() {
    const scale = getScale() || 1;
    const origin = stage.getBoundingClientRect();
    const list = frames();
    const id = selectedId;
    if (!id) {
      for (const box of selectionBoxes) box.hidden = true;
      return;
    }
    list.forEach((frame, index) => {
      const box = selectionBox(index);
      const node = frame.host.contentDocument().querySelector(byId(id));
      if (!isHtmlElement(node)) {
        box.hidden = true;
        return;
      }
      place(box, boxFor(node, frame, origin, scale));
    });
    for (let index = list.length; index < selectionBoxes.length; index += 1) {
      const extra = selectionBoxes[index];
      if (extra) extra.hidden = true;
    }
    placeHover();
  }

  function placeHover() {
    if (!hoverId || !hoverFrameId || hoverId === selectedId) {
      hover.hidden = true;
      return;
    }
    const frame = frames().find((item) => item.host.id === hoverFrameId);
    const node = frame?.host.contentDocument().querySelector(byId(hoverId));
    if (!frame || !isHtmlElement(node)) {
      hover.hidden = true;
      return;
    }
    place(hover, boxFor(node, frame, stage.getBoundingClientRect(), getScale() || 1));
  }

  function frameUnder(clientX: number, clientY: number): ViewportFrame | undefined {
    const scale = getScale() || 1;
    return frames().find((frame) => {
      const rect = frame.host.element.getBoundingClientRect();
      return pointInFrame({ clientX, clientY, frame: rect, scale }) !== null;
    });
  }

  function onKey(event: KeyboardEvent) {
    if (event.key !== 'Escape' || isEditableTarget(event.target)) return;
    show(null);
    onSelect?.(null);
  }

  window.addEventListener('keydown', onKey);

  return {
    show,
    hitAt,
    hoverAt,
    clearHover,
    reposition: placeBoxes,
    destroy() {
      window.removeEventListener('keydown', onKey);
      overlay.remove();
    },
  };

  function selectionBox(index: number): HTMLDivElement {
    const existing = selectionBoxes[index];
    if (existing) return existing;
    const box = document.createElement('div');
    box.className = 'selection-box';
    box.hidden = true;
    for (const name of HANDLES) {
      const handle = document.createElement('span');
      handle.className = `handle handle-${name}`;
      box.append(handle);
    }
    overlay.append(box);
    selectionBoxes[index] = box;
    return box;
  }
}

/** Iframe nodes fail `instanceof` against the editor realm. nodeType is shared. */
function isHtmlElement(value: unknown): value is HTMLElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nodeType' in value &&
    (value as Node).nodeType === Node.ELEMENT_NODE &&
    'dataset' in value
  );
}

function boxFor(
  node: HTMLElement,
  frame: ViewportFrame,
  stage: DOMRect,
  scale: number,
): OverlayBox {
  return overlayBox({
    element: node.getBoundingClientRect(),
    frame: frame.host.element.getBoundingClientRect(),
    stage,
    scale,
  });
}

function place(el: HTMLElement, box: OverlayBox) {
  el.hidden = false;
  el.style.left = `${box.x}px`;
  el.style.top = `${box.y}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
}

function byId(id: string): string {
  const escaped = String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `[data-id="${escaped}"]`;
}
