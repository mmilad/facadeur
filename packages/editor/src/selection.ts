import type { RenderedNode } from '@facadeur/renderer-dom';

const HANDLES = ['nw', 'ne', 'sw', 'se'];

export interface SelectionController {
  setNodes: (next: Map<string, RenderedNode>) => void;
  select: (id: string) => void;
  clear: () => void;
  reposition: () => void;
}

export function createSelection({
  stage,
  inspector,
  getScale,
}: {
  stage: HTMLElement;
  inspector: HTMLElement;
  getScale: () => number;
}): SelectionController {
  const box = document.createElement('div');
  box.className = 'selection-box';
  box.hidden = true;
  for (const name of HANDLES) {
    const handle = document.createElement('span');
    handle.className = `handle handle-${name}`;
    box.append(handle);
  }
  stage.append(box);

  let nodes = new Map<string, RenderedNode>();
  let selectedEl: HTMLElement | null = null;

  function select(id: string) {
    const record = nodes.get(id);
    const el = stage.querySelector(byId(id));
    if (!record || !(el instanceof HTMLElement)) {
      clear();
      return;
    }
    if (selectedEl) delete selectedEl.dataset.selected;
    selectedEl = el;
    el.dataset.selected = 'true';
    placeBox();
    renderInspector(record);
  }

  function clear() {
    if (selectedEl) delete selectedEl.dataset.selected;
    selectedEl = null;
    box.hidden = true;
    renderInspector(null);
  }

  function placeBox() {
    if (!selectedEl) {
      box.hidden = true;
      return;
    }
    const scale = getScale() || 1;
    const origin = stage.getBoundingClientRect();
    const rect = selectedEl.getBoundingClientRect();
    box.hidden = false;
    box.style.left = `${(rect.left - origin.left) / scale}px`;
    box.style.top = `${(rect.top - origin.top) / scale}px`;
    box.style.width = `${rect.width / scale}px`;
    box.style.height = `${rect.height / scale}px`;
  }

  function renderInspector(record: RenderedNode | null) {
    inspector.replaceChildren();
    if (!record) {
      const empty = document.createElement('p');
      empty.className = 'inspector-empty';
      empty.textContent = 'Nothing selected. Click an element on the stage.';
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

  let downId: string | null = null;
  let downX = 0;
  let downY = 0;

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const hit = event.target instanceof Element ? event.target.closest('[data-id]') : null;
    if (!(hit instanceof HTMLElement) || !stage.contains(hit)) {
      downId = null;
      return;
    }
    downId = hit.dataset.id ?? null;
    downX = event.clientX;
    downY = event.clientY;
  });

  stage.addEventListener('pointerup', (event) => {
    if (!downId) return;
    const hit = event.target instanceof Element ? event.target.closest('[data-id]') : null;
    const sameTarget = hit instanceof HTMLElement && hit.dataset.id === downId;
    const still = Math.hypot(event.clientX - downX, event.clientY - downY) < 4;
    const id = downId;
    downId = null;
    if (sameTarget && still) select(id);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clear();
  });

  renderInspector(null);

  return {
    setNodes(next) {
      nodes = next;
    },
    select,
    clear,
    reposition: placeBox,
  };
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
