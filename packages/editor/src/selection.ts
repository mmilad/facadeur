import type { RenderedNode } from '@facadeur/renderer-dom';
import { overlayBox, pointInFrame, type OverlayBox } from './geometry.js';
import type { ViewportFrame } from './viewports.js';

const HANDLES = ['nw', 'ne', 'sw', 'se'];

export interface SelectionController {
  select: (id: string) => void;
  clear: () => void;
  /** Node under the pointer, if it sits inside a viewport frame. */
  hitAt: (clientX: number, clientY: number) => { id: string } | null;
  hoverAt: (clientX: number, clientY: number) => void;
  clearHover: () => void;
  reposition: () => void;
}

export function createSelection({
  stage,
  inspector,
  getScale,
  frames,
}: {
  stage: HTMLElement;
  inspector: HTMLElement;
  getScale: () => number;
  frames: () => readonly ViewportFrame[];
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

  function select(id: string) {
    const record = recordFor(id);
    if (!record) {
      clear();
      return;
    }
    selectedId = id;
    if (hoverId === id) clearHover();
    placeBoxes();
    renderInspector(record);
  }

  function clear() {
    selectedId = null;
    for (const box of selectionBoxes) box.hidden = true;
    renderInspector(null);
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

  function recordFor(id: string): RenderedNode | undefined {
    for (const frame of frames()) {
      const record = frame.renderer.records.get(id);
      if (record) return record;
    }
    return undefined;
  }

  function frameUnder(clientX: number, clientY: number): ViewportFrame | undefined {
    const scale = getScale() || 1;
    return frames().find((frame) => {
      const rect = frame.host.element.getBoundingClientRect();
      return pointInFrame({ clientX, clientY, frame: rect, scale }) !== null;
    });
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clear();
  });

  renderInspector(null);

  return {
    select,
    clear,
    hitAt,
    hoverAt,
    clearHover,
    reposition: placeBoxes,
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

  function renderInspector(record: RenderedNode | null) {
    inspector.replaceChildren();
    if (!record) {
      const empty = document.createElement('p');
      empty.className = 'inspector-empty';
      empty.textContent = 'Nothing selected. Click an element in a viewport.';
      inspector.append(empty);
      return;
    }

    const idEl = document.createElement('p');
    idEl.className = 'inspector-id';
    idEl.textContent = record.id;
    inspector.append(idEl);

    const meta = document.createElement('dl');
    meta.className = 'kv';
    addRow(meta, 'Type', record.nodeType);
    addRow(meta, 'Tag', record.tag);
    if (record.name) addRow(meta, 'Name', record.name);
    if (record.component) addRow(meta, 'Component', record.component);
    if (record.ownerId) addRow(meta, 'Inside', record.ownerId);
    if (record.text) addRow(meta, 'Text', record.text);
    inspector.append(meta);

    if (record.fields && Object.keys(record.fields).length) {
      inspector.append(sectionTitle('Fields'));
      inspector.append(objectList(record.fields));
    }
    if (record.variants && Object.keys(record.variants).length) {
      inspector.append(sectionTitle('Variants'));
      inspector.append(objectList(record.variants));
    }
    if (record.nodeType !== 'instance' && Object.keys(record.attributes).length) {
      inspector.append(sectionTitle('Attributes'));
      inspector.append(objectList(record.attributes));
    }
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

function sectionTitle(text: string): HTMLHeadingElement {
  const heading = document.createElement('h3');
  heading.textContent = text;
  return heading;
}

function objectList(data: Record<string, unknown>): HTMLDListElement {
  const list = document.createElement('dl');
  list.className = 'kv';
  for (const [key, value] of Object.entries(data)) {
    addRow(list, key, value == null ? '' : String(value));
  }
  return list;
}

function addRow(list: HTMLDListElement, key: string, value: string) {
  const dt = document.createElement('dt');
  dt.textContent = key;
  const dd = document.createElement('dd');
  dd.textContent = value;
  list.append(dt, dd);
}
