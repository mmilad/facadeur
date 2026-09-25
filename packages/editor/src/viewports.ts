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

export interface ViewportFrame {
  breakpoint: Breakpoint;
  host: FrameHost;
  renderer: DomRenderer;
  styles: StyleEngine;
}

export interface ViewportBoard {
  /** The row of frames. Fit the stage to this element. */
  readonly element: HTMLElement;
  frames(): readonly ViewportFrame[];
  syncHeights(): void;
  /** Resolves after each frame's fonts settle, then measures heights again. */
  whenFontsReady(): Promise<void>;
  destroy(): void;
}

export function createViewportBoard(options: {
  parent: HTMLElement;
  documents: readonly DocumentFile[];
  page: DocumentFile;
  stores: readonly DocumentStore[];
  design: DesignInput;
  /** After a height sync or a breakpoint rebuild. */
  onLayout?: () => void;
}): ViewportBoard {
  const parent = options.parent;
  const stores = options.stores;
  const pageId = options.page.id;
  const row = parent.ownerDocument.createElement('div');
  row.className = 'viewport-frames';
  parent.append(row);

  let frames: ViewportFrame[] = [];
  let signature = '';
  let destroyed = false;
  let rebuildQueued = false;
  const unsubscribers: (() => void)[] = [];

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
    return activeBreakpoints(listed?.length ? listed : options.design.breakpoints);
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

      const slot = parent.ownerDocument.createElement('div');
      slot.className = 'viewport-label-slot';
      const label = parent.ownerDocument.createElement('p');
      label.className = 'viewport-label';
      label.textContent = `${breakpoint.id} · ${breakpoint.minWidth}`;
      slot.append(label);

      const screen = parent.ownerDocument.createElement('div');
      screen.className = 'viewport-screen';

      const host = createFrameHost({
        id: breakpoint.id,
        width: breakpoint.minWidth,
        ownerDocument: parent.ownerDocument,
      });
      host.element.title = `${breakpoint.id} viewport, ${breakpoint.minWidth}`;
      column.append(slot, screen);
      // The iframe only gets a document once it is connected.
      row.append(column);
      host.mount(screen);

      const styles = createStyleEngine(host.contentDocument());
      styles.setDesign(options.design);
      const renderer = createDomRenderer({
        parent: host.contentDocument().body,
        catalog: documents,
        styles,
      });
      renderer.mount(page);
      for (const store of stores) renderer.connect(store);
      frames.push({ breakpoint, host, renderer, styles });
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
