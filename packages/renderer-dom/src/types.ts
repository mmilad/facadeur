import type {
  ChildFieldOverrides,
  DocumentFile,
  DocumentStore,
  FieldValue,
  NestedNode,
  SchemaCatalog,
} from '@facadeur/core';
import type { RepeatScope } from './repeat-scope';

export interface RenderedNode {
  id: string;
  nodeType: NestedNode['type'];
  tag: string;
  name: string | null;
  text: string | null;
  attributes: Record<string, string>;
  component: string | null;
  fields: Record<string, FieldValue> | null;
  variants: Record<string, string> | null;
  ownerId: string | null;
}

export interface RenderContext {
  catalog: Map<string, DocumentFile>;
  /** Named schemas used to resolve structural component alternatives. */
  schemaCatalog?: SchemaCatalog;
  records: Map<string, RenderedNode>;
  path: string | null;
  scope: Record<string, FieldValue>;
  /** Innermost enclosing repeated item, carried across component boundaries. */
  repeatScope?: RepeatScope;
  /** Sparse field overrides owned by an enclosing instance. */
  childFields?: ChildFieldOverrides;
  /** Path to the current instance within `childFields`; empty means direct children. */
  childFieldPath?: string | null;
  ownerId: string | null;
  depth: number;
  /** Document whose root children are the canvas. Used to resolve instance paths. */
  canvasId: string | null;
  /** Resolved canvas document for preview-only mounted variants. */
  canvasDocument: DocumentFile | null;
  /** Component whose node IDs are being painted; preview selectors use this owner. */
  styleDocumentId: string | null;
  /** Optional editor-only preparation of instance documents after variant resolution. */
  prepareInstanceDocument?: (document: DocumentFile, variant: string | undefined) => DocumentFile;
}

export interface DocumentStyles {
  setDocument(
    document: DocumentFile,
    options?: {
      address?: 'instance' | 'canvas';
      paintRoot?: boolean;
      catalog?: readonly DocumentFile[];
    },
  ): void;
  removeDocument?(id: string): void;
}

export interface DomRenderer {
  readonly records: Map<string, RenderedNode>;
  /** Paint `document` into the parent. Root frame children are the canvas contents. */
  mount(document: DocumentFile): Map<string, RenderedNode>;
  /** Keep this parent in sync with one store. Style changes do not rebuild elements. */
  connect(store: DocumentStore): () => void;
  destroy(): void;
}
