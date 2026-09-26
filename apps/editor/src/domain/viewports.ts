/**
 * One iframe per breakpoint, side by side on the stage.
 * Each frame has its own renderer and style engine. They share the stores,
 * so one command updates every viewport.
 */

import { toNested, type Breakpoint, type DocumentFile, type DocumentStore } from '@facadeur/core';
import { createDomRenderer, type DomRenderer } from '@facadeur/renderer-dom';
import { createStyleEngine, type StyleEngine } from '@facadeur/style-engine';
import { activeBreakpoints, type DesignInput } from '@facadeur/tokens';
import { createFrameHost, type FrameHost } from './frame-host.js';
import { resolvedViewportChrome, type ViewportChromeSettings } from './viewport-chrome.js';

export interface ViewportFrame {
  breakpoint: Breakpoint;
  host: FrameHost;
  renderer: DomRenderer;
  styles: StyleEngine;
  /** Stage column element for this breakpoint. */
  column: HTMLElement;
}

export interface ViewportBoard {
  /** The row of frames. Fit the stage to this element. */
  readonly element: HTMLElement;
  frames(): readonly ViewportFrame[];
  /** Replace the project tokens, fonts, and breakpoint fallback, then repaint CSS. */
  setDesign(design: DesignInput): void;
  syncHeights(): void;
  /** Resolves after each frame's fonts settle, then measures heights again. */
  whenFontsReady(): Promise<void>;
  /** Apply session-only chrome without rebuilding frames. */
  applyChrome(getChrome: (breakpointId: string) => ViewportChromeSettings | undefined): void;
  destroy(): void;
}

export function createViewportBoard(options: {
  parent: HTMLElement;
  documents: readonly DocumentFile[];
  page: DocumentFile;
  stores: readonly DocumentStore[];
  design: DesignInput;
  /**
   * Paint the open document's root. Off for pages, where the root frame is the
   * canvas and only its children are content.
   */
  paintRoot?: boolean;
  /** After a height sync or a breakpoint rebuild. */
  onLayout?: () => void;
  getChrome?: (breakpointId: string) => ViewportChromeSettings | undefined;
}): ViewportBoard {
  const parent = options.parent;
  const stores = options.stores;
  const pageId = options.page.id;
  const paintRoot = options.paintRoot === true;
  let design = options.design;
  const row = parent.ownerDocument.createElement('div');
  row.className = 'viewport-frames';
  parent.append(row);

  let frames: ViewportFrame[] = [];
  let signature = '';
  let destroyed = false;
  let rebuildQueued = false;
  let getChrome = options.getChrome;
  const unsubscribers: (() => void)[] = [];

  function paintChrome(frame: ViewportFrame): void {
    const chrome = resolvedViewportChrome(
      frame.breakpoint,
      getChrome?.(frame.breakpoint.id),
      pageDocument().kind,
    );
    frame.column.style.padding = `${chrome.outerPaddingPx}px`;
    const title = frame.column.querySelector('.viewport-chrome-title');
    if (title) title.textContent = chrome.title;
    frame.host.setPreviewChrome({
      innerPaddingPx: chrome.innerPaddingPx,
      contentAlign: chrome.contentAlign,
    });
    const body = frame.column.querySelector('.viewport-chrome-body');
    if (body instanceof HTMLElement) {
      body.classList.toggle('is-align-center', chrome.contentAlign === 'center');
    }
  }

  function paintAllChrome(): void {
    for (const frame of frames) paintChrome(frame);
    syncHeights();
  }

  function pageDocument(): DocumentFile {
    const store = stores.find((item) => item.getDocument().id === pageId);
    return store ? toNested(store.getDocument()) : options.page;
  }

  function documentsNow(): DocumentFile[] {
    const byId = new Map(options.documents.map((document) => [document.id, document]));
    for (const store of stores) {
      const next = toNested(store.getDocument());
      byId.set(next.id, next);
    }
    return [...byId.values()];
  }

  function breakpointsNow(): Breakpoint[] {
    const page = pageDocument();
    const listed = page.settings?.breakpoints;
    return activeBreakpoints(listed?.length ? listed : design.breakpoints);
  }

  function destroyFrames(): void {
    for (const frame of frames) {
      frame.renderer.destroy();
      frame.styles.destroy();
      frame.host.destroy();
    }
    frames = [];
    row.replaceChildren();
  }

  function createFrames(): void {
    const breakpoints = breakpointsNow();
    signature = breakpoints.map((item) => `${item.id}:${item.minWidth}`).join('|');
    const documents = documentsNow();
    const page = documents.find((document) => document.id === pageId) ?? pageDocument();
    for (const breakpoint of breakpoints) {
      const column = parent.ownerDocument.createElement('section');
      column.className = 'viewport-frame';
      column.dataset.breakpoint = breakpoint.id;

      const chrome = parent.ownerDocument.createElement('div');
      chrome.className = 'viewport-chrome';

      const bar = parent.ownerDocument.createElement('div');
      bar.className = 'viewport-chrome-bar';

      const title = parent.ownerDocument.createElement('p');
      title.className = 'viewport-chrome-title';

      const body = parent.ownerDocument.createElement('div');
      body.className = 'viewport-chrome-body';

      const screen = parent.ownerDocument.createElement('div');
      screen.className = 'viewport-screen';

      bar.append(title);
      chrome.append(bar, body);
      column.append(chrome);

      const host = createFrameHost({
        id: breakpoint.id,
        width: breakpoint.minWidth,
        ownerDocument: parent.ownerDocument,
      });
      host.element.title = `${breakpoint.id} viewport, ${breakpoint.minWidth}px`;
      body.append(screen);
      row.append(column);
      host.mount(screen);

      const styles = createStyleEngine(host.contentDocument());
      styles.setDesign(design);
      const renderer = createDomRenderer({
        parent: host.contentDocument().body,
        catalog: documents,
        styles,
        paintRoot,
      });
      renderer.mount(page);
      for (const store of stores) renderer.connect(store);
      const frame: ViewportFrame = { breakpoint, host, renderer, styles, column };
      frames.push(frame);
      paintChrome(frame);
    }
  }

  function syncHeights(): void {
    for (const frame of frames) frame.host.syncHeight();
    options.onLayout?.();
  }

  function rebuild(): void {
    if (destroyed) return;
    destroyFrames();
    createFrames();
    syncHeights();
  }

  function scheduleRebuild(): void {
    if (rebuildQueued || destroyed) return;
    rebuildQueued = true;
    queueMicrotask(() => {
      rebuildQueued = false;
      if (destroyed) return;
      const next = breakpointsNow()
        .map((item) => `${item.id}:${item.minWidth}`)
        .join('|');
      if (next === signature) return;
      rebuild();
    });
  }

  const pageStore = stores.find((item) => item.getDocument().id === pageId);
  if (pageStore) unsubscribers.push(pageStore.subscribe(() => scheduleRebuild()));
  createFrames();
  for (const store of stores) {
    unsubscribers.push(
      store.subscribe(() => {
        syncHeights();
      }),
    );
  }

  return {
    element: row,
    frames() {
      return frames;
    },
    setDesign(next) {
      design = next;
      for (const frame of frames) frame.styles.setDesign(design);
      scheduleRebuild();
    },
    syncHeights,
    async whenFontsReady() {
      await Promise.all(
        frames.map(async (frame) => {
          const fonts = frame.host.contentDocument().fonts;
          if (fonts) await fonts.ready;
        }),
      );
      if (!destroyed) syncHeights();
    },
    applyChrome(nextGetChrome) {
      getChrome = nextGetChrome;
      paintAllChrome();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
      unsubscribers.length = 0;
      destroyFrames();
      row.remove();
    },
  };
}
