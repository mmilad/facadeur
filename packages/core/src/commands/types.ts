import type { ValidateOptions } from '../validation/tree.js';
import type { NodeType } from '../document/kinds.js';
import type { FlatNode } from '../document/flat.js';
import type {
  Binding,
  Breakpoint,
  DisplayOn,
  EventBinding,
  EventDefinition,
  Expose,
  FieldDefinition,
  FieldValue,
  FontFamily,
  Layout,
  PreviewData,
  Repeat,
  StyleBlock,
  TokenInterface,
  VariantAxis,
  VariantPreset,
  VariantRule,
} from '../document/schema.js';
import type { ComponentToken } from '../component-tokens.js';
import type { TokenDefinition, TokenGroupDefinition } from '../token-tree.js';

export interface CommandContext extends ValidateOptions {
  createId?: () => string;
  /** Resolve a deep instance field for command-time validation. Resets may omit it. */
  resolveChildField?: (
    node: Extract<FlatNode, { type: 'instance' }>,
    path: string,
    field: string,
  ) => FieldDefinition | undefined;
  /** Global DTCG paths from the design document; used when applying token commands. */
  globalTokenPaths?: ReadonlySet<string>;
}

/** Node passed to `insert`. Ids are assigned when omitted. */
export interface InsertNode {
  id?: string;
  type: NodeType;
  name?: string;
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
  variants?: Record<string, string>;
  variantRules?: VariantRule[];
  children?: InsertNode[];
}

export type NodeProp =
  | 'name'
  | 'tag'
  | 'text'
  | 'src'
  | 'alt'
  | 'attributes'
  | 'displayOn'
  | 'layout'
  | 'bindings'
  | 'eventBindings'
  | 'fieldBindings'
  | 'variantRules'
  | 'repeat'
  | 'component';

// Instance selection rules are evaluated against the owning component's data.
export type Command =
  | { type: 'batch'; commands: Command[] }
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
  | { type: 'defineEvent'; event: EventDefinition }
  | { type: 'removeEvent'; name: string }
  | { type: 'setExpose'; expose: Expose | null }
  | { type: 'defineVariant'; axis: VariantAxis }
  | { type: 'removeVariant'; name: string }
  | { type: 'setVariantPreset'; preset: VariantPreset }
  | { type: 'createVariantPreset'; name: string; label: string }
  | { type: 'setVariantStyleBlock'; name: string; style: StyleBlock | null }
  | { type: 'removeVariantPreset'; name: string }
  | { type: 'setToken'; path: string; token: TokenDefinition }
  | { type: 'removeToken'; path: string }
  | { type: 'setTokenGroup'; path: string; group: TokenGroupDefinition }
  | { type: 'removeTokenGroup'; path: string }
  | { type: 'setFont'; font: FontFamily }
  | { type: 'removeFont'; id: string }
  | { type: 'setBreakpoints'; breakpoints: Breakpoint[] }
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
