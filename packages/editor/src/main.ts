import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { createDocumentStore } from '@facadeur/store-yjs';
import { createProjectTemplate } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createSelection } from './selection.js';
import { createStage } from './stage.js';
import { createViewportBoard } from './viewports.js';
import './styles.css';

/** Keeps the board, stores, and engines alive after main() returns. */
const session: object[] = [];

const pageName = document.querySelector('#page-name');
const viewport = document.querySelector('#viewport');
const stageEl = document.querySelector('#stage');
const inspector = document.querySelector('#inspector');
const zoomReadout = document.querySelector('#zoom-readout');
const resetView = document.querySelector('#reset-view');

function showBootError(error: unknown) {
  const message = document.createElement('p');
  message.className = 'boot-error';
  const detail = error instanceof Error ? error.message : 'Unknown error';
  message.textContent = `Could not open the specimen (${detail}).`;
  document.querySelector('.workspace')?.replaceChildren(message);
}

function main() {
  if (
    !(pageName instanceof HTMLElement) ||
    !(viewport instanceof HTMLElement) ||
    !(stageEl instanceof HTMLElement) ||
    !(inspector instanceof HTMLElement) ||
    !(zoomReadout instanceof HTMLElement) ||
    !(resetView instanceof HTMLButtonElement)
  ) {
    showBootError(new Error('Demo chrome is missing'));
    return;
  }

  let documents: DocumentFile[];
  try {
    documents = validateCatalog([button, input, card, signIn, specimenSection, specimenPage]);
  } catch (error) {
    showBootError(error);
    return;
  }

  const page = documents.find((entry) => entry.id === 'specimen');
  if (!page) {
    showBootError(new Error('Specimen page is missing'));
    return;
  }

  pageName.textContent = page.name;

  let untouched = true;
  try {
    const design = createProjectTemplate();
    const stores = documents.map((entry) => createDocumentStore(entry));
    let onLayout = () => {};
    const board = createViewportBoard({
      parent: stageEl,
      documents,
      page,
      stores,
      design,
      onLayout: () => onLayout(),
    });
    const stage = createStage(viewport, stageEl);
    const selection = createSelection({
      stage: stageEl,
      inspector,
      getScale: () => stage.getScale(),
      frames: () => board.frames(),
    });
    onLayout = () => selection.reposition();
    session.push(board, ...stores);

    const fit = () => {
      board.syncHeights();
      stage.fit(board.element);
      stageEl.classList.add('is-ready');
    };

    stage.onChange(({ scale }) => {
      zoomReadout.textContent = `${Math.round(scale * 100)}%`;
      selection.reposition();
    });
    stage.onClick((event) => {
      const hit = selection.hitAt(event.clientX, event.clientY);
      if (hit) selection.select(hit.id);
      else selection.clear();
    });

    viewport.addEventListener('pointermove', (event) => {
      if (stage.isPanning()) {
        selection.clearHover();
        return;
      }
      selection.hoverAt(event.clientX, event.clientY);
    });
    viewport.addEventListener('pointerdown', () => {
      untouched = false;
    });
    viewport.addEventListener('wheel', () => {
      untouched = false;
    });

    stageEl.addEventListener('pointerdown', (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('input, button, textarea, select')
      ) {
        event.preventDefault();
      }
    });

    resetView.addEventListener('click', () => {
      untouched = true;
      fit();
    });
    fit();
    void board.whenFontsReady().then(() => {
      if (untouched) fit();
      else selection.reposition();
    });
  } catch (error) {
    showBootError(error);
  }
}

main();
