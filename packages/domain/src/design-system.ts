import type { Uuid } from './uuid';

/**
 * W3C [DTCG](https://tr.designtokens.org/format/) token tree: nested groups and leaf tokens (`$value`).
 * Ids are **path-based** (`color.blue.500`), not catalog uuids. Typography composites, colors, and
 * spacing share this shape; `$type` on a group or token selects validation/resolution behavior.
 */
export type DesignTokenTree = Readonly<Record<string, unknown>>;

export type FontStyle = 'normal' | 'italic';

export interface FontFaceFile {
  readonly weight: number;
  readonly style: FontStyle;
  readonly url: string;
  readonly format?: string;
}

export type FontSource =
  | { readonly type: 'file'; readonly files: readonly FontFaceFile[] }
  | { readonly type: 'google'; readonly family: string };

/**
 * Loadable font family registry (`{font.sans}` in token strings). Not stored as DTCG tokens —
 * files, Google sources, and weight lists live here instead of `$value` leaves.
 */
export interface FontFamilyDefinition {
  readonly id: string;
  readonly family: string;
  readonly weights: readonly number[];
  readonly styles?: readonly FontStyle[];
  readonly source: FontSource;
  readonly fallbacks: readonly string[];
}

/**
 * Semantic design prop (`{prop:uuid}` in node `style`). Maps a stable uuid to a token path or literal.
 * Distinct from component **data** props and from raw DTCG paths.
 */
export interface DesignPropDefinition {
  readonly uuid: Uuid;
  readonly name: string;
  readonly value: string;
}

export type StyleDeclarations = Readonly<Record<string, string>>;

export interface StyleStates {
  readonly hover?: StyleDeclarations;
  readonly 'focus-visible'?: StyleDeclarations;
  readonly disabled?: StyleDeclarations;
}

export interface StyleLayer {
  readonly declarations?: StyleDeclarations;
  readonly states?: StyleStates;
}

/** Responsive / variant layers keyed by breakpoint or variant value id. */
export type LayerMap = Readonly<Record<string, StyleLayer>>;

export type VariantStyleMap = Readonly<Record<string, LayerMap>>;

export interface StyleChildLayer extends StyleLayer {
  readonly variants?: VariantStyleMap;
  readonly breakpoints?: LayerMap;
}

/** Project-wide CSS authored like a design document `styles` block (not per-node `style`). */
export interface GlobalStyleBlock {
  readonly declarations?: StyleDeclarations;
  readonly states?: StyleStates;
  readonly variants?: VariantStyleMap;
  readonly breakpoints?: LayerMap;
  readonly children?: Readonly<Record<string, StyleChildLayer>>;
  readonly rules?: readonly GlobalStyleRule[];
}

export interface GlobalStyleRule {
  readonly id: string;
  readonly selector: string;
  readonly bindings?: Readonly<Record<string, string>>;
  readonly declarations?: StyleDeclarations;
  readonly states?: StyleStates;
  readonly variants?: VariantStyleMap;
  readonly breakpoints?: LayerMap;
}

/** Which global token paths the compiled stylesheet reads or sets on the project root. */
export interface TokenInterface {
  readonly reads?: readonly string[];
  readonly sets?: Readonly<Record<string, string>>;
}

export interface Breakpoint {
  readonly id: string;
  readonly label?: string;
  readonly minWidth: number;
  readonly enabled?: boolean;
}

/**
 * Design-system presentation: global stylesheet + token adoption + viewport breakpoints.
 * Migrated from legacy `project-template.json` (`styles`, `tokenInterface`, `settings.breakpoints`).
 */
export interface GlobalStyles {
  readonly block?: GlobalStyleBlock;
  readonly tokenInterface?: TokenInterface;
  readonly breakpoints?: readonly Breakpoint[];
}
