/**
 * One same-origin iframe. Callers read the frame document only through this
 * object, so a later host can isolate the frame without changing the editor.
 * There is no postMessage channel.
 */

const SHELL_ID = 'facadeur-frame-shell';

/** Bottom of the painted content in iframe CSS pixels. */
function contentHeight(frameDocument: Document): number {
  const body = frameDocument.body;
  if (!body) return 0;
  let bottom = 0;
  for (const child of body.children) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const rect = child.getBoundingClientRect();
    bottom = Math.max(bottom, rect.bottom);
  }
  return bottom;
}

const FRAME_SHELL_CSS = `
  html, body { margin: 0; background: #fffcf7; }
  body { overflow: hidden; }
  .ds-unknown {
    padding: 8px 10px;
    border: 1px dashed #9c4221;
    color: #9c4221;
    font: 12px ui-monospace, monospace;
  }
`;

export interface FrameHostOptions {
  /** Breakpoint id. Stable for the life of the host. */
  id: string;
  /** CSS pixel width of the iframe. This is the breakpoint width. */
  width: number;
  /** Document that owns the iframe element. Defaults to the global document. */
  ownerDocument?: Document;
}

export interface FrameHost {
  readonly id: string;
  /**
   * The iframe element on the stage. Measure and place it from here.
   * Do not read `contentDocument` or `contentWindow` off this element.
   */
  readonly element: HTMLIFrameElement;
  /** Same-origin document inside the frame. */
  contentDocument(): Document;
  /** Window inside the frame, for hit testing and layout. */
  contentWindow(): Window;
  setWidth(width: number): void;
  /** Grow the iframe to its content. Returns the applied height in CSS pixels. */
  syncHeight(): number;
  /** Insert the iframe and prepare its document. */
  mount(parent: HTMLElement): void;
  destroy(): void;
}

export function createFrameHost(options: FrameHostOptions): FrameHost {
  const owner = options.ownerDocument ?? document;
  const element = owner.createElement('iframe');
  element.className = 'viewport-iframe';
  element.title = options.id;
  element.setAttribute('scrolling', 'no');
  element.tabIndex = -1;
  element.style.pointerEvents = 'none';
  element.style.display = 'block';
  element.style.border = '0';
  element.style.width = `${options.width}px`;
  let width = options.width;
  let mounted = false;
  let destroyed = false;
  let observer: ResizeObserver | undefined;
  let mutations: MutationObserver | undefined;
  let syncing = false;

  function contentDocument(): Document {
    assertOpen();
    const frameDocument = element.contentDocument;
    if (!frameDocument) {
      throw new Error(`Frame "${options.id}" has no document`);
    }
    return frameDocument;
  }

  function contentWindow(): Window {
    const frameWindow = contentDocument().defaultView;
    if (!frameWindow) {
      throw new Error(`Frame "${options.id}" has no window`);
    }
    return frameWindow;
  }

  function assertOpen(): void {
    if (destroyed || !mounted) {
      throw new Error(`Frame "${options.id}" has no document`);
    }
  }

  function ensureShell(frameDocument: Document): void {
    const { head, body } = frameDocument;
    if (!head || !body) {
      throw new Error(`Frame "${options.id}" document has no head or body`);
    }
    if (frameDocument.getElementById(SHELL_ID)) return;
    const style = frameDocument.createElement('style');
    style.id = SHELL_ID;
    style.textContent = FRAME_SHELL_CSS;
    head.append(style);
  }

  function syncHeight(): number {
    const frameDocument = contentDocument();
    const next = Math.max(1, Math.ceil(contentHeight(frameDocument)));
    if (element.style.height !== `${next}px`) element.style.height = `${next}px`;
    return next;
  }

  function watch(frameDocument: Document): void {
    const body = frameDocument.body;
    if (!body) return;
    const measure = () => {
      if (syncing) return;
      syncing = true;
      try {
        syncHeight();
      } finally {
        syncing = false;
      }
    };
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(body);
    }
    // The first measure often runs before the renderer inserts the root.
    // A clipped body does not resize, so watch the tree as well.
    if (typeof MutationObserver !== 'undefined') {
      mutations = new MutationObserver(measure);
      mutations.observe(body, { childList: true, subtree: true, characterData: true });
    }
  }

  return {
    id: options.id,
    element,
    contentDocument,
    contentWindow,
    setWidth(next) {
      width = next;
      element.style.width = `${width}px`;
    },
    syncHeight,
    mount(parent) {
      if (destroyed) throw new Error(`Frame "${options.id}" was destroyed`);
      if (mounted) return;
      if (!parent.isConnected) {
        throw new Error(`Frame "${options.id}" must be mounted in the document`);
      }
      parent.append(element);
      mounted = true;
      ensureShell(contentDocument());
      watch(contentDocument());
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      observer = undefined;
      mutations?.disconnect();
      mutations = undefined;
      element.remove();
      mounted = false;
    },
  };
}
