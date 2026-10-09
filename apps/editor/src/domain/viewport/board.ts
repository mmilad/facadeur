/** Editor canvas: one iframe per active project breakpoint. */
import {
  breakpointLabel,
  type Breakpoint,
  type ElementBuildConfig,
  type ProjectCatalogModel,
} from '@facadeur/core';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { activeBreakpoints } from '@facadeur/tokens';
import { createFrameHost, type FrameHost } from './frame-host';
import { DynamicElement } from './dynamic-element';

export interface ViewportFrame {
  breakpoint: Breakpoint;
  host: FrameHost;
  /** Stage column element for this breakpoint. */
  column: HTMLElement;
}

export interface ViewportBoard {
  /** The row of frames. Fit the stage to this element. */
  readonly element: HTMLElement;
  frames(): readonly ViewportFrame[];
  /** Update the mounted React tree while keeping each iframe and element alive. */
  updateBuildConfig(config: ElementBuildConfig, title?: string): void;
  syncHeights(): void;
  destroy(): void;
}

export function createViewportBoard(options: {
  parent: HTMLElement;
  buildConfig: ElementBuildConfig;
  title: string;
  catalog: ProjectCatalogModel;
}): ViewportBoard {
  const ownerDocument = options.parent.ownerDocument;
  const row = ownerDocument.createElement('div');
  row.className = 'viewport-frames';
  options.parent.append(row);

  const breakpoints = activeBreakpoints(options.catalog.globalStyles?.breakpoints);
  const frames: ViewportFrame[] = [];
  const roots: Root[] = [];

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
    // Let pointer events reach the stage; selection overlays are painted above this iframe.
    host.element.style.pointerEvents = 'none';
    body.append(screen);
    row.append(column);
    host.mount(screen);
    const root = createRoot(host.contentDocument().body);
    root.render(createElement(DynamicElement, { config: options.buildConfig }));
    roots.push(root);

    frames.push({ breakpoint, host, column });
  }

  return {
    element: row,
    frames() {
      return frames;
    },
    updateBuildConfig(config, title = options.title) {
      frames.forEach((frame, index) => {
        frame.host.element.title = `${title} — ${breakpointLabel(frame.breakpoint)}`;
        roots[index]?.render(createElement(DynamicElement, { config }));
      });
    },
    syncHeights() {
      for (const frame of frames) frame.host.syncHeight();
    },
    destroy() {
      for (const root of roots) root.unmount();
      for (const frame of frames) frame.host.destroy();
      row.remove();
    },
  };
}
