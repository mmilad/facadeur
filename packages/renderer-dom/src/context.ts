import type { DocumentFile } from '@facadeur/core';
import type { RenderContext, RenderedNode } from './types';

export function createRenderContext(documents: readonly DocumentFile[]): RenderContext {
  const catalog = new Map<string, DocumentFile>();
  for (const document of documents) catalog.set(document.id, document);
  return {
    catalog,
    records: new Map<string, RenderedNode>(),
    path: null,
    scope: {},
    childFieldPath: null,
    ownerId: null,
    depth: 0,
    canvasId: null,
    canvasDocument: null,
    styleDocumentId: null,
  };
}
