import type { FieldValue, JsonSchemaField } from '@facadeur/core';
import type { FormFieldConfig, TransformableFieldOption } from '@facadeur/form';

/** Editor-owned display data for the project and layer sidebar. */
export interface SidebarAsset {
  readonly id: string;
  readonly label: string;
  readonly slug?: string;
  readonly kind: string;
  readonly category?: string;
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
  readonly layerStyle: {
    readonly selector: string;
    readonly declarations: Readonly<Record<string, string>>;
    readonly breakpoints: readonly import('@facadeur/core').Breakpoint[];
    readonly overrides: Readonly<Record<string, Readonly<Record<string, string>>>>;
  };
  readonly headerFields: readonly FormFieldConfig[];
  readonly tabs: readonly {
    readonly id: 'style' | 'properties' | 'previewData' | 'config';
    readonly label: string;
    readonly sections: readonly {
      readonly label: string;
      readonly fields: readonly FormFieldConfig[];
    }[];
    readonly configFields?: readonly {
      readonly field: JsonSchemaField;
      readonly label: string;
      readonly instanceUuid?: string;
      readonly instanceLabel?: string;
      readonly isStatic: boolean;
      readonly value?: FieldValue;
      readonly exposed: boolean;
      readonly valueOptions: readonly TransformableFieldOption[];
    }[];
  }[];
  readonly values: Readonly<Record<string, unknown>>;
  readonly bindOptions: readonly {
    value: string;
    label: string;
    description?: string;
    group?: string;
  }[];
  readonly styleValueOptions: readonly TransformableFieldOption[];
}

export interface SidebarViewModel {
  readonly project: ProjectSidebarModel;
  readonly layers: LayerSidebarModel;
  readonly inspector: InspectorSidebarModel | null;
}
