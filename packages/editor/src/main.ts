import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { renderDocument } from '@facadeur/renderer-dom';
import { createProjectTemplate, renderDesignCss } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createSelection } from './selection.js';
import { createStage } from './stage.js';
import './styles.css';

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

  try {
    const tokens = document.createElement('style');
    tokens.id = 'facadeur-tokens';
    tokens.textContent = renderDesignCss(createProjectTemplate());
    document.head.append(tokens);
  } catch (error) {
    showBootError(error);
    return;
  }

  let documents: DocumentFile[];
  try {
    documents = validateCatalog([button, input, card, signIn, specimenSection, specimenPage]);
  } catch (error) {
    showBootError(error);
    return;
  }

  const page = documents.find((document) => document.id === 'specimen');
  if (!page) {
    showBootError(new Error('Specimen page is missing'));
    return;
  }

  pageName.textContent = page.name;
  const board = document.createElement('div');
  board.className = 'artboard';
  const artboard = page.settings?.artboard ?? { width: 960, height: 640 };
  board.style.width = `${artboard.width}px`;
  board.style.height = `${artboard.height}px`;
  stageEl.append(board);

  const records = renderDocument(page, documents, board);
  const stage = createStage(viewport, stageEl);
  const selection = createSelection({
    stage: stageEl,
    inspector,
    getScale: () => stage.getScale(),
  });
  selection.setNodes(records);

  stage.onChange(({ scale }) => {
    zoomReadout.textContent = `${Math.round(scale * 100)}%`;
    selection.reposition();
  });
  stage.onBackgroundClick(() => selection.clear());

  stageEl.addEventListener('pointerdown', (event) => {
    if (
      event.target instanceof Element &&
      event.target.closest('input, button, textarea, select')
    ) {
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
