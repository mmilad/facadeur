/** Catalog preview board: one iframe per active project breakpoint. */
import { breakpointLabel, type ProjectCatalogModel } from '@facadeur/core';
import { buildElement } from '@facadeur/renderer-dom';
import type { DomRenderer } from '@facadeur/renderer-dom';
import { activeBreakpoints } from '@facadeur/tokens';
import type { StyleEngine } from '@facadeur/style-engine';
import { createFrameHost } from './frame-host';
import type { ViewportBoard, ViewportFrame } from './viewports';

type ElementBuildConfig = Parameters<typeof buildElement>[0];

function mountPreview(host: ReturnType<typeof createFrameHost>, buildConfig: ElementBuildConfig) {
  const doc = host.contentDocument();
  doc.body.replaceChildren(buildElement(buildConfig, { document: doc }));
}

export function createV2ViewportBoard(options: {
  parent: HTMLElement;
  buildConfig: ElementBuildConfig;
  title: string;
  catalog: ProjectCatalogModel;
}): ViewportBoard {
  const ownerDocument = options.parent.ownerDocument;
  const row = ownerDocument.createElement('div');
  row.className = 'viewport-frames v2-board';
  options.parent.append(row);

  const breakpoints = activeBreakpoints(options.catalog.globalStyles?.breakpoints);
  const frames: ViewportFrame[] = [];

  for (const breakpoint of breakpoints) {
    const column = ownerDocument.createElement('section');
    column.className = 'viewport-frame';
    column.dataset.breakpoint = breakpoint.id;

    const chrome = ownerDocument.createElement('div');
    chrome.className = 'viewport-chrome';

    const bar = ownerDocument.createElement('div');
    bar.className = 'viewport-chrome-bar';

    const chromeTitle = ownerDocument.createElement('p');
    chromeTitle.className = 'viewport-chrome-title';
    chromeTitle.textContent = `${breakpointLabel(breakpoint)} · ${breakpoint.minWidth}px`;

    const body = ownerDocument.createElement('div');
    body.className = 'viewport-chrome-body';

    const screen = ownerDocument.createElement('div');
    screen.className = 'viewport-screen';

    bar.append(chromeTitle);
    chrome.append(bar, body);
    column.append(chrome);

    const host = createFrameHost({
      id: breakpoint.id,
      width: breakpoint.minWidth,
      ownerDocument,
    });
    host.element.title = `${options.title} — ${breakpointLabel(breakpoint)}`;
    host.element.style.pointerEvents = 'auto';
    body.append(screen);
    row.append(column);
    host.mount(screen);
    mountPreview(host, options.buildConfig);

    frames.push({
      breakpoint,
      host,
      column,
      renderer: null as unknown as DomRenderer,
      styles: null as unknown as StyleEngine,
    });
  }

  return {
    element: row,
    frames() {
      return frames;
    },
    setDesign() {},
    syncHeights() {
      for (const frame of frames) frame.host.syncHeight();
    },
    whenFontsReady() {
      return Promise.resolve();
    },
    applyChrome() {},
    setVariant() {},
    destroy() {
      for (const frame of frames) frame.host.destroy();
      row.remove();
    },
  };
}
