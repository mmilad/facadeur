import type { ValidateOptions } from '../../validation/types';
import type { NodeType } from '../../../../document/kinds';
import type { FlatNode } from '../../../../document/flat';
import type {
  Binding,
  ComponentSchemaUse,
  DisplayOn,
  EventBinding,
  EventDefinition,
  Expose,
  FieldDefinition,
  FieldValue,
  Layout,
  PreviewData,
  SchemaCatalog,
  Repeat,
  StyleBlock,
  TokenInterface,
  VariantAxis,
  VariantPreset,
  VariantRule,
} from '../../../../schema/document';
import type { ComponentToken } from '../../../../controller/style/tokens/component/contract';
import type { SchemaResolverContext } from '../../validation/types';
import type { DesignLibraryCommand, GlobalTokenCommand } from '../../../../controller/style/types';

export interface CommandContext extends ValidateOptions {
  createId?: () => string;
  /** Full project contract context for schema-aware command validation. */
  schemaResolverContext?: SchemaResolverContext;
  /** Resolve a deep instance field for command-time validation. Resets may omit it. */
  resolveChildField?: (
    node: Extract<FlatNode, { type: 'instance' }>,
    path: string,
    field: string,
  ) => FieldDefinition | undefined;
  /** Global token UUIDs from the design document; used when applying token commands. */
  globalTokenUuids?: ReadonlySet<string>;
}

/** Node passed to `insert`. Ids are assigned when omitted. */
export interface InsertNode {
  id?: string;
  type: NodeType;
  name?: string;
  styleName?: string;
  classes?: string[];
  tag?: string;
  attributes?: Record<string, string>;
  displayOn?: DisplayOn;
  layout?: Layout;
  bindings?: Binding[];
  eventBindings?: EventBinding[];
  fieldBindings?: Record<string, string>;
  repeat?: Repeat;
  style?: Record<string, string>;
  text?: string;
  src?: string;
  alt?: string;
  component?: string;
  fields?: Record<string, FieldValue>;
  childFields?: Record<string, Record<string, FieldValue>>;
  forwardFields?: boolean;
  switchCase?: string;
  variants?: Record<string, string>;
  variantRules?: VariantRule[];
  children?: InsertNode[];
}

export type NodeProp =
  | 'name'
  | 'styleName'
  | 'classes'
  | 'tag'
  | 'text'
  | 'src'
  | 'alt'
  | 'attributes'
  | 'displayOn'
  | 'layout'
  | 'bindings'
  | 'eventBindings'
  | 'forwardFields'
  | 'switchCase'
  | 'fieldBindings'
  | 'variantRules'
  | 'repeat'
  | 'component';

// Instance selection rules are evaluated against the owning component's data.
export type Command =
  | { type: 'batch'; commands: Command[] }
  | { type: 'setDocumentMetadata'; name: string; slug: string }
  | { type: 'setDocumentGroup'; group: string | null }
  | { type: 'insert'; parentId: string; index?: number; node: InsertNode }
  | { type: 'remove'; nodeId: string }
  | { type: 'move'; nodeId: string; parentId: string; index: number }
  | { type: 'wrap'; nodeId: string; frameId?: string }
  | { type: 'setProp'; nodeId: string; prop: NodeProp; value: unknown }
  | { type: 'setStyle'; nodeId: string; property: string; value: string | null }
  | { type: 'setField'; nodeId: string; field: string; value: FieldValue | null }
  | {
      type: 'setChildField';
      nodeId: string;
      path: string;
      field: string;
      value: FieldValue | null;
    }
  | { type: 'setVariant'; nodeId: string; axis: string; value: string | null }
  | { type: 'defineField'; field: FieldDefinition }
  | { type: 'setPreviewData'; previewData: PreviewData | null }
  | { type: 'setVariantLabels'; labels: Record<string, string> | null }
  | { type: 'removeField'; name: string }
  | {
      type: 'defineEvent';
      event: EventDefinition;
      previousName?: string;
      bindings?: Record<string, EventBinding[]>;
    }
  | { type: 'removeEvent'; name: string }
  | { type: 'setExpose'; expose: Expose | null }
  | { type: 'defineVariant'; axis: VariantAxis }
  | { type: 'removeVariant'; name: string }
  | { type: 'setVariantPreset'; preset: VariantPreset }
  | { type: 'createVariantPreset'; name: string; label: string }
  | { type: 'setVariantStyleBlock'; name: string; style: StyleBlock | null }
  | { type: 'removeVariantPreset'; name: string }
  | GlobalTokenCommand
  | DesignLibraryCommand
  | { type: 'setSchemaCatalog'; schemaCatalog: SchemaCatalog | null }
  | { type: 'setSchemaUse'; schemaUse: ComponentSchemaUse | null }
  | { type: 'setStyleBlock'; style: StyleBlock | null }
  | { type: 'setTokenInterface'; tokenInterface: TokenInterface | null }
  | {
      type: 'setComponentToken';
      id: string;
      path: string;
      token: Omit<ComponentToken, 'path'>;
    }
  | { type: 'removeComponentToken'; id: string }
  | { type: 'renameComponentTokenPath'; id: string; path: string };
