import type { FormFieldConfig } from '@facadeur/form';

/** Editor-owned display data for the project and layer sidebar. */
export interface SidebarAsset {
  readonly id: string;
  readonly label: string;
  readonly slug?: string;
  readonly kind: string;
}

export interface SidebarLayer {
  readonly id: string;
  readonly address: string;
  readonly label: string;
  readonly type: string;
  readonly tagName?: string;
  readonly children: readonly SidebarLayer[];
  readonly virtual: boolean;
  readonly documentId: string;
  readonly canDelete: boolean;
  readonly insertInside: readonly SidebarInsertOption[];
  readonly insertBelow: readonly SidebarInsertOption[];
}

export interface SidebarInsertOption {
  readonly kind: 'instance' | 'primitive';
  readonly value: string;
  readonly label: string;
}

export interface ProjectSidebarModel {
  readonly assets: readonly SidebarAsset[];
  readonly openId: string;
  readonly draggableAssetIds: readonly string[];
}

export interface LayerSidebarModel {
  readonly title: string;
  readonly rootId: string | null;
  readonly layers: SidebarLayer | null;
  readonly selectedId: string | null;
  readonly selectedRenderId: string | null;
  readonly draggedNodeId: string | null;
}

export interface InspectorSidebarModel {
  readonly nodeId: string;
  readonly formKey: string;
  readonly selectionKind: 'root' | 'instance' | 'element';
  readonly headerFields: readonly FormFieldConfig[];
  readonly tabs: readonly {
    readonly id: 'style' | 'properties' | 'previewData';
    readonly label: string;
    readonly sections: readonly { readonly label: string; readonly fields: readonly FormFieldConfig[] }[];
  }[];
  readonly values: Readonly<Record<string, unknown>>;
  readonly bindOptions: readonly {
    value: string; label: string; description?: string; group?: string;
  }[];
}

export interface SidebarViewModel {
  readonly project: ProjectSidebarModel;
  readonly layers: LayerSidebarModel;
  readonly inspector: InspectorSidebarModel | null;
}

export type SidebarIntent =
  | { readonly type: 'asset.open'; readonly id: string }
  | { readonly type: 'asset.create'; readonly kind: string }
  | { readonly type: 'asset.rename'; readonly id: string; readonly name: string }
  | { readonly type: 'asset.delete'; readonly id: string }
  | { readonly type: 'asset.drag.start'; readonly id: string }
  | { readonly type: 'asset.drag.end' }
  | { readonly type: 'layer.select'; readonly id: string }
  | { readonly type: 'layer.drag.start'; readonly id: string }
  | { readonly type: 'layer.drag.end' }
  | { readonly type: 'layer.delete'; readonly id: string }
  | {
      readonly type: 'layer.insert';
      readonly targetId: string;
      readonly placement: 'inside' | 'below';
      readonly kind: string;
      readonly value: string;
    }
  | {
      readonly type: 'layer.move';
      readonly sourceId: string;
      readonly targetId: string;
      readonly zone: 'before' | 'inside' | 'after';
    }
  | { readonly type: 'inspector.change'; readonly nodeId: string; readonly path: string; readonly value: unknown };
