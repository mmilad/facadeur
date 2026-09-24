/**
 * Click a rendered node to select it. The outline and corner handles are
 * chrome only — they are not part of the JSON tree and do not resize.
 * Clicking empty stage background clears the selection (wired by the stage).
 */

const HANDLES = ['nw', 'ne', 'sw', 'se'];

export function createSelection({ stage, inspector, getScale }) {
  const box = document.createElement('div');
  box.className = 'selection-box';
  box.hidden = true;
  for (const name of HANDLES) {
    const handle = document.createElement('span');
    handle.className = `handle handle-${name}`;
    box.append(handle);
  }
  stage.append(box);

  let nodes = new Map();
  let selectedId = null;
  let selectedEl = null;

  function select(id) {
    const record = nodes.get(id);
    const el = stage.querySelector(byId(id));
    if (!record || !el) {
      clear();
      return;
    }
    if (selectedEl) delete selectedEl.dataset.selected;
    selectedId = id;
    selectedEl = el;
    el.dataset.selected = 'true';
    placeBox();
    renderInspector(record);
  }

  function clear() {
    selectedId = null;
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

  function renderInspector(record) {
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
    addRow(meta, 'Kind', record.kind);
    if (record.type) addRow(meta, 'Type', record.type);
    addRow(meta, 'Tag', record.tagName);
    if (record.ownerId) addRow(meta, 'Inside', record.ownerId);
    if (record.kind === 'element' && record.text) addRow(meta, 'Text', record.text);
    inspector.append(meta);

    inspector.append(sectionTitle('Props'));
    if (record.props && Object.keys(record.props).length) {
      inspector.append(objectList(record.props));
    } else {
      inspector.append(emptyNote('None'));
    }

    if (record.variants && Object.keys(record.variants).length) {
      inspector.append(sectionTitle('Variants'));
      inspector.append(objectList(record.variants));
    }

    if (record.kind === 'element' && record.attributes && Object.keys(record.attributes).length) {
      inspector.append(sectionTitle('Attributes'));
      inspector.append(objectList(record.attributes));
    }
  }

  let downId = null;
  let downX = 0;
  let downY = 0;

  stage.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const hit = event.target.closest('[data-id]');
    if (!hit || !stage.contains(hit)) {
      downId = null;
      return;
    }
    downId = hit.dataset.id;
    downX = event.clientX;
    downY = event.clientY;
  });

  stage.addEventListener('pointerup', (event) => {
    if (!downId) return;
    const hit = event.target.closest('[data-id]');
    const sameTarget = hit && hit.dataset.id === downId;
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

function byId(id) {
  const escaped = String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `[data-id="${escaped}"]`;
}

function sectionTitle(text) {
  const heading = document.createElement('h3');
  heading.textContent = text;
  return heading;
}

function emptyNote(text) {
  const p = document.createElement('p');
  p.className = 'inspector-none';
  p.textContent = text;
  return p;
}

function objectList(data) {
  const list = document.createElement('dl');
  list.className = 'kv';
  for (const [key, value] of Object.entries(data)) {
    addRow(list, key, value == null ? '' : String(value));
  }
  return list;
}

function addRow(list, key, value) {
  const dt = document.createElement('dt');
  dt.textContent = key;
  const dd = document.createElement('dd');
  dd.textContent = value;
  list.append(dt, dd);
}
