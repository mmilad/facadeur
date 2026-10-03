import type {
  Binding,
  ChildFieldOverrides,
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
  StyleBlock,
  TokenInterface,
  VariantAxis,
  VariantPreset,
  VariantRule,
  Repeat,
} from '../schema.js';
import type { ComponentTokenMap } from '../../component-tokens.js';
import type { TokenTree } from '../../token-tree.js';

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
  fieldBindings?: Record<string, string>;
  variants?: Record<string, string>;
  variantRules?: VariantRule[];
  expose?: Expose;
}

export type FlatNode = FrameNode | TextNode | ImageNode | InstanceNode;

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
  nodes: Record<string, FlatNode>;
}
