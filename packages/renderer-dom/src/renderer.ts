import type { DocumentFile } from '@facadeur/core';
import { toNested } from '@facadeur/core';
import { paintCanvas, repaintComponent } from './paint';
import { isStyleOnly, resolveFields } from './resolve';
import type { DocumentStyles, DomRenderer, RenderContext, RenderedNode } from './types';

export function createDomRenderer(options: {
  parent: HTMLElement;
  catalog: readonly DocumentFile[];
  styles?: DocumentStyles;
  /** Resolve the mounted document for a preview-only editor context. */
  resolveMountedDocument?: (document: DocumentFile) => DocumentFile;
  prepareInstanceDocument?: (document: DocumentFile, variant: string | undefined) => DocumentFile;
  /** When set, the root node is painted. Pages omit this: the root frame is the canvas. */
  paintRoot?: boolean;
}): DomRenderer {
  const parent = options.parent;
  const paintRoot = options.paintRoot === true;
  const catalog = new Map<string, DocumentFile>();
  for (const document of options.catalog) catalog.set(document.id, document);
  const records = new Map<string, RenderedNode>();
  let mountedId: string | null = null;
  const unsubscribers: (() => void)[] = [];

  function context(): RenderContext {
    const mounted = mountedId ? catalog.get(mountedId) : undefined;
    const canvas = mounted ? mountedDocument(mounted) : undefined;
    return {
      catalog,
      records,
      path: null,
      scope: canvas ? resolveFields(canvas.fields, undefined) : {},
      ownerId: null,
      depth: 0,
      canvasId: mountedId,
      canvasDocument: canvas ?? null,
      styleDocumentId: mountedId,
      prepareInstanceDocument: options.prepareInstanceDocument,
    };
  }

  function mountedDocument(document: DocumentFile): DocumentFile {
    return options.resolveMountedDocument?.(document) ?? document;
  }

  function syncStyles(document: DocumentFile): void {
    const mountedAsCanvas = document.id === mountedId && !paintRoot;
    const address = mountedAsCanvas ? 'canvas' : 'instance';
    options.styles?.setDocument(document, {
      address,
      catalog: [...catalog.values()],
      ...(document.id === mountedId && paintRoot ? { paintRoot: true } : {}),
    });
  }

  function paintMounted(): void {
    if (!mountedId) return;
    const source = catalog.get(mountedId);
    if (!source) return;
    const document = mountedDocument(source);
    const ctx = context();
    ctx.scope = resolveFields(document.fields, undefined);
    ctx.styleDocumentId = document.id;
    paintCanvas(parent, document, ctx, paintRoot);
  }

  const renderer: DomRenderer = {
    records,
    mount(document) {
      mountedId = document.id;
      catalog.set(document.id, document);
      for (const entry of catalog.values()) syncStyles(mountedDocument(entry));
      records.clear();
      paintMounted();
      return records;
    },
    connect(store) {
      const unsubscribe = store.subscribe((change) => {
        const next = toNested(store.getDocument());
        catalog.set(next.id, next);
        for (const entry of catalog.values()) {
          syncStyles(entry.id === mountedId ? mountedDocument(entry) : entry);
        }
        if (isStyleOnly(change)) return;
        if (next.id === mountedId) {
          paintMounted();
          return;
        }
        repaintComponent(parent, next.id, context());
      });
      unsubscribers.push(unsubscribe);
      return unsubscribe;
    },
    destroy() {
      for (const unsubscribe of unsubscribers) unsubscribe();
      unsubscribers.length = 0;
      if (mountedId) options.styles?.removeDocument?.(mountedId);
      records.clear();
    },
  };

  return renderer;
}
