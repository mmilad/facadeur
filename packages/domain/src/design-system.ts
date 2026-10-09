import type { Uuid } from './uuid';

/** Stable identity for one design token, independent of its editable label or group. */
export type DesignTokenUuid = Uuid;
export type BreakpointUuid = Uuid;

/** Editor-internal reference syntax persisted in catalog node values. */
export type DesignTokenReference = `{token:${DesignTokenUuid}}`;

export interface DesignTokenIdentity {
  readonly uuid: DesignTokenUuid;
}

export type DesignTokenFamily = 'color' | 'space' | 'radius' | 'shadow' | 'type' | 'font';
export type DesignTokenValueType =
  'color' | 'dimension' | 'number' | 'fontFamily' | 'fontWeight' | 'shadow' | 'typography';

export type DesignTokenValue =
  | string
  | number
  | boolean
  | null
  | readonly DesignTokenValue[]
  | { readonly [key: string]: DesignTokenValue };

/** Shared persisted/runtime shape for every design token family. Empty group means family root. */
export interface DesignTokenRecord<Value = DesignTokenValue> {
  readonly uuid: DesignTokenUuid;
  readonly label: string;
  readonly group: string;
  readonly valueType: DesignTokenValueType;
  readonly value: Value;
  readonly breakpoints?: Readonly<Record<DesignTokenUuid, DesignTokenValue>>;
  readonly extensions?: Readonly<Record<string, DesignTokenValue>>;
}

export type FontStyle = 'normal' | 'italic';

export type FontFaceFile = Readonly<Record<string, DesignTokenValue>> & {
  readonly weight: number;
  readonly style: FontStyle;
  readonly url: string;
  readonly format?: string;
};

export type FontSource =
  | (Readonly<Record<string, DesignTokenValue>> & {
      readonly type: 'file';
      readonly files: readonly FontFaceFile[];
    })
  | (Readonly<Record<string, DesignTokenValue>> & {
      readonly type: 'google';
      readonly family: string;
    });

/** Font-specific payload carried by a token in the `font` family. */
export type FontFamilyValue = Readonly<Record<string, DesignTokenValue>> & {
  readonly family: string;
  readonly weights: readonly number[];
  readonly styles?: readonly FontStyle[];
  readonly source: FontSource;
  readonly fallbacks: readonly string[];
};

export interface FontFamilyDefinition extends DesignTokenRecord<FontFamilyValue> {
  readonly valueType: 'fontFamily';
}

export type DesignTokenFamilyMap = Readonly<Record<DesignTokenUuid, DesignTokenRecord>>;
export type DesignTokenSet = Readonly<{
  color: DesignTokenFamilyMap;
  space: DesignTokenFamilyMap;
  radius: DesignTokenFamilyMap;
  shadow: DesignTokenFamilyMap;
  type: DesignTokenFamilyMap;
  font: Readonly<Record<DesignTokenUuid, FontFamilyDefinition>>;
}>;

/** Canonical UUID-keyed token collections. */
export type DesignTokenTree = DesignTokenSet;

/**
 * Semantic design prop (`{prop:uuid}` in node `style`). Maps a stable uuid to a token reference or literal.
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

/** Global token references read by the document and values it sets on the component root. */
export interface TokenInterface {
  /** UUIDs referenced by styles, layout, component-token defaults, or set values. */
  readonly reads?: readonly string[];
  /** Global token UUIDs or exposed component-token public paths mapped to override values. */
  readonly sets?: Readonly<Record<string, string>>;
}

export interface Breakpoint {
  readonly uuid: BreakpointUuid;
  readonly label: string;
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
