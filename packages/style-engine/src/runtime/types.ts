import type { Breakpoint, DocumentChange, DocumentFile } from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';
import type { CompileOptions } from '../compiler/types';
import type { StyleController } from './controller';
export interface RuleChild {
  selector: string;
  rules: RuleInput;
}

/** CSS declarations plus optional child rules. `children` is not a declaration. */
export interface RuleInput {
  children?: RuleChild[];
  [property: string]: string | number | RuleChild[] | undefined;
}

export interface StyleControllerTarget {
  /** Document that owns the stylesheet. Defaults to the global document. */
  document?: Document;
  /** Existing style element. Created in `document.head` when omitted. */
  styleElement?: HTMLStyleElement;
}

export type StyleOwner = CSSStyleSheet | CSSGroupingRule;

export interface StyleEngine {
  readonly controller: StyleController;
  readonly ownerDocument: Document;
  /** Breakpoints from the last `setDesign` call. Documents inherit them when they list none. */
  readonly breakpoints: readonly Breakpoint[];
  setDesign(input?: DesignInput, options?: { selector?: string }): void;
  setDocument(document: DocumentFile, options?: CompileOptions): void;
  /** Rebuild this document's rules. The DOM is not involved. */
  applyChange(document: DocumentFile, _change: DocumentChange): void;
  removeDocument(id: string): void;
  destroy(): void;
}
