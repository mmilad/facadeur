import type { FieldValue, JsonSchemaObject } from '@facadeur/domain';
import type { DesignPropDefinition } from '@facadeur/domain';
import type { Node } from '@facadeur/domain';
import type { Breakpoint, CatalogDesignCommand, DesignTokenFamily } from '@facadeur/core';

/** Stable event names emitted by editor UI. */
export enum EditorEventType {
  AssetOpen = 'asset.open',
  AssetCreate = 'asset.create',
  AssetRename = 'asset.rename',
  AssetCategorySet = 'asset.category.set',
  AssetDelete = 'asset.delete',
  AssetDragStart = 'asset.drag.start',
  AssetDragEnd = 'asset.drag.end',
  LayerSelect = 'layer.select',
  LayerDragStart = 'layer.drag.start',
  LayerDragEnd = 'layer.drag.end',
  LayerDelete = 'layer.delete',
  LayerWrap = 'layer.wrap',
  LayerSelectParent = 'layer.select-parent',
  LayerInsert = 'layer.insert',
  LayerCopy = 'layer.copy',
  LayerPaste = 'layer.paste',
  LayerMove = 'layer.move',
  InspectorFieldChange = 'inspector.field.change',
  SurfaceNavigate = 'surface.navigate',
  ToolSet = 'editor.tool.set',
  ZoomBy = 'editor.zoom.by',
  ZoomReset = 'editor.zoom.reset',
  CanvasFit = 'editor.canvas.fit',
  ViewportFocus = 'editor.viewport.focus',
  ViewportSelect = 'editor.viewport.select',
  EditTargetSet = 'editor.edit-target.set',
  CatalogPersist = 'catalog.persist',
  CatalogExport = 'catalog.export',
  DesignPropsSave = 'catalog.design-props.save',
  SchemaUpsert = 'catalog.schema.upsert',
  SchemaRemove = 'catalog.schema.remove',
  SchemasSave = 'catalog.schemas.save',
  DefinitionSchemaSet = 'catalog.definition.schema.set',
  PreviewFieldSet = 'catalog.preview-field.set',
  DesignPropUpsert = 'catalog.design-prop.upsert',
  DesignPropRemove = 'catalog.design-prop.remove',
  DesignCommandExecute = 'design.command.execute',
  DesignTokenRemove = 'design.token.remove',
  BreakpointsSet = 'design.breakpoints.set',
  NoticeSet = 'editor.notice.set',
  NodeSelect = 'editor.node.select',
  NodeInsert = 'catalog.node.insert',
  NodeMove = 'catalog.node.move',
  NodeStyleRecordSet = 'catalog.node.style-record.set',
}

/** Data payloads stay flat and contain only UI values and stable identifiers. */
export interface EditorEventDataMap {
  [EditorEventType.AssetOpen]: { readonly assetId: string };
  [EditorEventType.AssetCreate]: { readonly kind: 'atom' | 'component' | 'page' };
  [EditorEventType.AssetRename]: { readonly assetId: string; readonly name: string };
  [EditorEventType.AssetCategorySet]: {
    readonly assetId: string;
    readonly category: string | undefined;
  };
  [EditorEventType.AssetDelete]: { readonly assetId: string };
  [EditorEventType.AssetDragStart]: { readonly assetId: string };
  [EditorEventType.AssetDragEnd]: Record<never, never>;
  [EditorEventType.LayerSelect]: { readonly nodeId: string };
  [EditorEventType.LayerDragStart]: { readonly nodeId: string };
  [EditorEventType.LayerDragEnd]: Record<never, never>;
  [EditorEventType.LayerDelete]: { readonly nodeId: string };
  [EditorEventType.LayerWrap]: { readonly nodeId: string };
  [EditorEventType.LayerSelectParent]: Record<never, never>;
  [EditorEventType.LayerInsert]: {
    readonly targetId: string;
    readonly placement: 'inside' | 'below';
    readonly kind: 'instance' | 'primitive';
    readonly value: string;
  };
  [EditorEventType.LayerCopy]: {
    readonly nodeId: string;
  };
  [EditorEventType.LayerPaste]: {
    readonly targetId: string;
    readonly placement: 'inside' | 'below';
  };
  [EditorEventType.LayerMove]: {
    readonly sourceId: string;
    readonly targetId: string;
    readonly zone: 'before' | 'inside' | 'after';
  };
  [EditorEventType.InspectorFieldChange]: {
    readonly nodeId: string;
    readonly path: string;
    readonly value: FieldValue | undefined;
  };
  [EditorEventType.SurfaceNavigate]: { readonly surfaceId: string };
  [EditorEventType.ToolSet]: { readonly tool: 'select' | 'frame' | 'text' | 'image' };
  [EditorEventType.ZoomBy]: { readonly factor: number };
  [EditorEventType.ZoomReset]: Record<never, never>;
  [EditorEventType.CanvasFit]: Record<never, never>;
  [EditorEventType.ViewportFocus]: { readonly breakpointId: string | null };
  [EditorEventType.ViewportSelect]: { readonly breakpointId: string | null };
  [EditorEventType.EditTargetSet]: { readonly target: 'base' | 'viewport' };
  [EditorEventType.CatalogPersist]: Record<never, never>;
  [EditorEventType.CatalogExport]: Record<never, never>;
  [EditorEventType.DesignPropsSave]: Record<never, never>;
  [EditorEventType.SchemaUpsert]: {
    readonly uuid: string;
    readonly schema: JsonSchemaObject;
  };
  [EditorEventType.SchemaRemove]: { readonly uuid: string };
  [EditorEventType.SchemasSave]: Record<never, never>;
  [EditorEventType.DefinitionSchemaSet]: {
    readonly definitionId: string;
    readonly schema:
      | { readonly kind: 'inline'; readonly schema: JsonSchemaObject }
      | { readonly kind: 'ref'; readonly uuid: string };
  };
  [EditorEventType.PreviewFieldSet]: {
    readonly field: string;
    readonly value: FieldValue | undefined;
  };
  [EditorEventType.DesignPropUpsert]: { readonly prop: DesignPropDefinition };
  [EditorEventType.DesignPropRemove]: { readonly uuid: string };
  [EditorEventType.DesignCommandExecute]: { readonly command: CatalogDesignCommand };
  [EditorEventType.DesignTokenRemove]: {
    readonly family: DesignTokenFamily;
    readonly uuid: string;
    readonly label: string;
  };
  [EditorEventType.BreakpointsSet]: {
    readonly breakpoints: readonly Breakpoint[];
    readonly focusBreakpointId?: string;
  };
  [EditorEventType.NoticeSet]: {
    readonly text: string;
    readonly tone: 'info' | 'error';
  };
  [EditorEventType.NodeSelect]: { readonly nodeId: string | null };
  [EditorEventType.NodeInsert]: {
    readonly parentId: string;
    readonly index: number;
    readonly node: Node;
  };
  [EditorEventType.NodeMove]: {
    readonly nodeId: string;
    readonly parentId: string;
    readonly index: number;
  };
  [EditorEventType.NodeStyleRecordSet]: {
    readonly nodeId: string;
    readonly style: Readonly<Record<string, string>>;
  };
}

export type EditorEvent = {
  [Type in EditorEventType]: {
    readonly type: Type;
    readonly data: EditorEventDataMap[Type];
  };
}[EditorEventType];
