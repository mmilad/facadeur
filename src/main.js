import { createContext, renderNode } from './render.js';
import { createSelection } from './selection.js';
import { createStage } from './stage.js';

const pageName = document.querySelector('#page-name');
const viewport = document.querySelector('#viewport');
const stageEl = document.querySelector('#stage');
const inspector = document.querySelector('#inspector');
const zoomReadout = document.querySelector('#zoom-readout');
const resetView = document.querySelector('#reset-view');

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} (${response.status})`);
  }
  return response.json();
}

function showBootError(error) {
  const message = document.createElement('p');
  message.className = 'boot-error';
  message.textContent = `Could not load the demo (${error.message}). Serve this folder over HTTP — opening the file directly will not work. See the README.`;
  document.querySelector('.workspace').replaceChildren(message);
}

async function main() {
  let page;
  let components;
  try {
    [page, components] = await Promise.all([
      loadJson('./examples/demo-page.json'),
      loadJson('./examples/components.json'),
    ]);
  } catch (error) {
    showBootError(error);
    return;
  }

  pageName.textContent = page.name || page.id || 'Page';

  const board = document.createElement('div');
  board.className = 'artboard';
  const artboard = page.artboard ?? { width: 960, height: 640 };
  board.style.width = `${artboard.width}px`;
  board.style.height = `${artboard.height}px`;
  stageEl.append(board);

  const ctx = createContext(components);
  for (const child of page.children ?? []) {
    board.append(renderNode(child, ctx));
  }

  const stage = createStage(viewport, stageEl);
  const selection = createSelection({
    stage: stageEl,
    inspector,
    getScale: () => stage.getScale(),
  });
  selection.setNodes(ctx.nodes);

  stage.onChange(({ scale }) => {
    zoomReadout.textContent = `${Math.round(scale * 100)}%`;
    selection.reposition();
  });
  stage.onBackgroundClick(() => selection.clear());

  // Keep form controls from taking focus; selection uses click instead.
  stageEl.addEventListener('pointerdown', (event) => {
    if (event.target.closest('input, button, textarea, select')) {
      event.preventDefault();
    }
  });

  const fit = () => {
    stage.fit(board);
    stageEl.classList.add('is-ready');
  };

  resetView.addEventListener('click', fit);
  fit();
}

main();
