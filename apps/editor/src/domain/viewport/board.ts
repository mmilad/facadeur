/** Editor canvas: one iframe per active project breakpoint. */
import { breakpointLabel, type Breakpoint } from '@facadeur/core';
import { createFrameHost, type FrameHost } from './frame-host';

export interface ViewportFrame {
  breakpoint: Breakpoint;
  host: FrameHost;
  /** Stage column element for this breakpoint. */
  column: HTMLElement;
}

export interface RenderedNodeBox {
  uuid: string;
  rect: { left: number; top: number; width: number; height: number };
}

export interface ViewportBoard {
  /** The row of frames. Fit the stage to this element. */
  readonly element: HTMLElement;
  frames(): readonly ViewportFrame[];
  renderedNodes(frame: ViewportFrame): readonly RenderedNodeBox[];
  setTitle(title: string): void;
  setInteractionEnabled(enabled: boolean): void;
  syncHeights(): void;
  destroy(): void;
}

export function createViewportBoard(options: {
  parent: HTMLElement;
  title: string;
  breakpoints: readonly Breakpoint[];
}): ViewportBoard {
  const ownerDocument = options.parent.ownerDocument;
  const row = ownerDocument.createElement('div');
  row.className = 'viewport-frames';
  options.parent.append(row);

  const frames: ViewportFrame[] = [];
  let destroyed = false;

  for (const breakpoint of options.breakpoints) {
    const column = ownerDocument.createElement('section');
    column.className = 'viewport-frame';
    column.dataset.breakpoint = breakpoint.uuid;

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
      id: breakpoint.uuid,
      width: breakpoint.minWidth,
      ownerDocument,
    });
    host.element.title = `${options.title} — ${breakpointLabel(breakpoint)}`;
    // Stage layer selection owns pointer input unless preview interactions are enabled.
    host.element.style.pointerEvents = 'none';
    body.append(screen);
    row.append(column);
    host.mount(screen);
    frames.push({ breakpoint, host, column });
  }

  return {
    element: row,
    frames() {
      return frames;
    },
    renderedNodes(frame) {
      const nodes = frame.host
        .contentDocument()
        .querySelectorAll<HTMLElement>('[data-facadeur-node-uuid]');
      return [...nodes].flatMap((node) => {
        const uuid = node.dataset.facadeurNodeUuid;
        if (!uuid) return [];
        const { left, top, width, height } = node.getBoundingClientRect();
        return [{ uuid, rect: { left, top, width, height } }];
      });
    },
    setTitle(title) {
      for (const frame of frames) {
        frame.host.element.title = `${title} — ${breakpointLabel(frame.breakpoint)}`;
      }
    },
    setInteractionEnabled(enabled) {
      for (const frame of frames) {
        frame.host.element.style.pointerEvents = enabled ? 'auto' : 'none';
      }
    },
    syncHeights() {
      for (const frame of frames) frame.host.syncHeight();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const frame of frames) frame.host.destroy();
      row.remove();
    },
  };
}
