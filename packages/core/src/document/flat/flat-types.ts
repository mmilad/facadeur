import type {
  Binding,
  ChildFieldOverrides,
  ComponentSchemaUse,
  DisplayOn,
  DocumentSettings,
  EventBinding,
  EventDefinition,
  Expose,
  FieldDefinition,
  FieldValue,
  FontFamily,
  IconDefinition,
  Layout,
  PreviewData,
  SchemaCatalog,
  StyleBlock,
  TokenInterface,
  VariantAxis,
  VariantPreset,
  VariantRule,
  Repeat,
} from '../../schema/document.js';
import type { ComponentTokenMap } from '../../controller/style/tokens/component/contract.js';
import type { TokenTree } from '../../controller/style/tokens/types.js';

export interface FlatNodeBase {
  id: string;
  name?: string;
  styleName?: string;
  tag?: string;
  attributes?: Record<string, string>;
  displayOn?: DisplayOn;
  layout?: Layout;
  bindings?: Binding[];
  eventBindings?: EventBinding[];
  style?: Record<string, string>;
}

export interface FrameNode extends FlatNodeBase {
  type: 'frame';
  repeat?: Repeat;
  children: string[];
}

export interface RepeaterNode {
  id: string;
  type: 'repeater';
  name?: string;
  styleName?: never;
  tag?: never;
  attributes?: never;
  displayOn?: never;
  layout?: never;
  bindings?: never;
  eventBindings?: never;
  style?: never;
  repeat?: never;
  children: string[];
}

export interface SwitchNode {
  id: string;
  type: 'switch';
  name?: string;
  styleName?: never;
  tag?: never;
  attributes?: never;
  displayOn?: never;
  layout?: never;
  bindings?: never;
  eventBindings?: never;
  style?: never;
  repeat?: never;
  children: string[];
}

export interface TextNode extends FlatNodeBase {
  type: 'text';
  text?: string;
}

export interface ImageNode extends FlatNodeBase {
  type: 'image';
  src?: string;
  alt?: string;
}

/** Instances carry placement plus field, variant, and containing-document style overrides. */
export interface InstanceNode {
  id: string;
  type: 'instance';
  name?: string;
  styleName?: string;
  displayOn?: DisplayOn;
  layout?: Layout;
  component: string;
  fields?: Record<string, FieldValue>;
  childFields?: ChildFieldOverrides;
  forwardFields?: boolean;
  switchCase?: string;
  fieldBindings?: Record<string, string>;
  variants?: Record<string, string>;
  variantRules?: VariantRule[];
  expose?: Expose;
}

export type StructuralNode = RepeaterNode | SwitchNode;

export type FlatNode = FrameNode | TextNode | ImageNode | InstanceNode | StructuralNode;

/** In-memory document: one map of nodes, children as ordered id lists. */
export interface FlatDocument {
  version: 1;
  id: string;
  name: string;
  kind: string;
  group?: string;
  rootId: string;
  fields: FieldDefinition[];
  previewData?: PreviewData;
  variantLabels?: Record<string, string>;
  events?: EventDefinition[];
  expose?: Expose;
  variants: VariantAxis[];
  variantPresets?: VariantPreset[];
  settings: DocumentSettings;
  /** DTCG tree. Empty when the file omits tokens. References stay unresolved. */
  tokens: TokenTree;
  fonts: FontFamily[];
  icons?: IconDefinition[];
  /** Component style block: base, variants, states, breakpoints. */
  styles?: StyleBlock;
  /** Tokens this component reads, and tokens it sets for descendants. */
  tokenInterface?: TokenInterface;
  /** Local tokens owned by this document; defaults reference globals or literals. */
  componentTokens?: ComponentTokenMap;
  /** Named JSON Schemas live with the project's design document. */
  schemaCatalog?: SchemaCatalog;
  /** This component's persisted assignment/composition of named schemas. */
  schemaUse?: ComponentSchemaUse;
  nodes: Record<string, FlatNode>;
}
