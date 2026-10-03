import type { Breakpoint, DocumentFile, NestedNode, StyleRule } from '@facadeur/core';
import type { SubstituteContext } from '../css/types';
export interface CompiledRule {
  key: string;
  selector: string;
  declarations: [string, string][];
  /** Set for a breakpoint override. The base layer has no min-width. */
  minWidth?: number;
  /** The authored rule and its stable node bindings, when this is a selector rule. */
  styleRuleId?: string;
  styleRuleBindings?: Record<string, string>;
}

export interface CompileOptions {
  /**
   * `instance` scopes rules with `data-component`, so every instance shares them.
   * `canvas` scopes the open document with `data-id`. Its frame root is the artboard
   * and is not painted, so that root emits no rule — unless `paintRoot` is set.
   */
  address?: 'instance' | 'canvas';
  /**
   * Paint the frame root on the canvas. Pages leave this off. An atom, component,
   * or section root is the component itself, so the open workspace has to show it.
   */
  paintRoot?: boolean;
  /** Used when the document does not list breakpoints. Defaults to mobile, tablet, desktop. */
  breakpoints?: readonly Breakpoint[];
  /** Catalog used to resolve nested style target paths. */
  catalog?: readonly DocumentFile[];
  /** Allows output adapters to replace attribute selectors with local selectors. */
  selectorForNode?: (context: {
    documentId: string;
    node: NestedNode;
    nodeId: string;
    path: string | null;
    isRoot: boolean;
    address: 'instance' | 'canvas';
    defaultSelector: string;
    targetPath?: string;
    variantScope?: string;
  }) => string;
  /** Allows output adapters to scope authored selectors for their rendering target. */
  selectorForStyleRule?: (context: {
    documentId: string;
    rule: StyleRule;
    selector: string;
    nodeClassNames: ReadonlyMap<string, string>;
    address: 'instance' | 'canvas';
    variantScope?: string;
    axisVariant?: { axis: string; value: string };
  }) => string;
}

export interface StyleLayerOutputState {
  breakpoints: readonly Breakpoint[];
  substituteContext: SubstituteContext;
  rules: CompiledRule[];
}

export interface WalkState {
  address: 'instance' | 'canvas';
  breakpoints: readonly Breakpoint[];
  parentDirection: 'row' | 'column' | undefined;
  path: string | null;
  isRoot: boolean;
  rendered: boolean;
  variantScope?: string;
  substituteContext: SubstituteContext;
  rules: CompiledRule[];
  selectorForNode?: CompileOptions['selectorForNode'];
}
