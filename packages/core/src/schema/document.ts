import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { defaultKinds } from '../document/kinds';
import { childFieldPathSchema, idSchema, kindSchema } from './common';
import {
  bindingSchema,
  bindingTargetSchema,
  bindingTargets,
  displayOnSchema,
  eventBindingSchema,
  eventDefinitionSchema,
  exposePathSchema,
  exposeSchema,
  fieldDefinitionSchema,
  fieldTypeSchema,
  fieldTypes,
  fieldValueSchema,
  repeatSchema,
  variantRuleSchema,
  type BindingTarget,
  type FieldType,
  type FieldValue,
} from './fields';
import {
  breakpointSchema,
  fontFaceFileSchema,
  fontFamilySchema,
  fontSourceSchema,
  fontStyleSchema,
  iconDefinitionSchema,
  previewDataSchema,
  settingsSchema,
  tokenTreeSchema,
  tokenTypeSchema,
  tokenTypes,
  withTokenDefs,
  type TokenType,
} from './fonts';
import {
  axisSizeSchema,
  layoutOverrideSchema,
  layoutSchema,
  sizeValueSchema,
  marginBoxSchema,
  marginSchema,
  spacingBoxSchema,
  spacingSchema,
  tokenPathSchema,
  tokenRefSchema,
} from './layout';
import { nestedNodeSchema } from './nodes';
import {
  styleBlockSchema,
  styleChildSchema,
  styleLayerSchema,
  styleRuleSchema,
  styleStatesSchema,
  tokenInterfaceSchema,
} from './style';
import { componentTokensSchema } from './component-tokens';
import {
  basicSchemaTypes,
  componentSchemaUseSchema,
  schemaCatalogSchema,
  schemaTypeRefSchema,
  schemaFieldUseSchema,
  namedSchemaSchema,
  type BasicSchemaType,
  type ComponentSchemaUse,
  type JsonSchema,
  type NamedSchema,
  type SchemaCatalog,
  type SchemaFieldUse,
  type SchemaTypeRef,
} from './contract';
import {
  variantAxisSchema,
  variantInsertionSchema,
  variantNodeOverrideSchema,
  variantOverridesSchema,
  variantPresetSchema,
} from './variants';

export {
  fieldTypes,
  type FieldType,
  bindingTargets,
  type BindingTarget,
  childFieldPathSchema,
  type FieldValue,
  fieldValueSchema,
  fieldTypeSchema,
  bindingTargetSchema,
  kindSchema,
  tokenTypes,
  type TokenType,
  tokenTypeSchema,
  tokenTreeSchema,
  fontStyleSchema,
  fontFaceFileSchema,
  fontSourceSchema,
  fontFamilySchema,
  iconDefinitionSchema,
  breakpointSchema,
  fieldDefinitionSchema,
  eventDefinitionSchema,
  exposePathSchema,
  exposeSchema,
  eventBindingSchema,
  variantAxisSchema,
  tokenRefSchema,
  tokenPathSchema,
  marginBoxSchema,
  marginSchema,
  spacingBoxSchema,
  spacingSchema,
  sizeValueSchema,
  axisSizeSchema,
  layoutOverrideSchema,
  layoutSchema,
  styleStatesSchema,
  styleLayerSchema,
  styleRuleSchema,
  styleChildSchema,
  styleBlockSchema,
  tokenInterfaceSchema,
  bindingSchema,
  displayOnSchema,
  repeatSchema,
  variantRuleSchema,
  variantNodeOverrideSchema,
  nestedNodeSchema,
  variantInsertionSchema,
  variantOverridesSchema,
  variantPresetSchema,
  previewDataSchema,
  settingsSchema,
  componentSchemaUseSchema,
  basicSchemaTypes,
  schemaCatalogSchema,
  schemaTypeRefSchema,
  schemaFieldUseSchema,
  namedSchemaSchema,
};

export const DOCUMENT_SCHEMA_ID = 'https://github.com/mmilad/facadeur/schema/document.schema.json';

export interface DocumentSchemaOptions {
  kinds?: readonly string[];
  schemaId?: string;
}

const documentSchemaMeta = {
  additionalProperties: false,
  title: 'Facadeur document',
  description:
    'Nested facadeur document. Nodes are frame, text, image, or instance. Tokens are a DTCG tree. Fonts list families and their sources. A style block paints the component. Instances override fields and variants, and their containing document may add sparse root appearance rules.',
} as const;

function documentProperties<Kind extends TSchema>(kind: Kind) {
  return {
    version: Type.Literal(1),
    id: idSchema,
    slug: Type.Optional(idSchema),
    name: Type.String({ minLength: 1 }),
    kind,
    group: Type.Optional(Type.String({ minLength: 1 })),
    fields: Type.Optional(Type.Array(fieldDefinitionSchema)),
    previewData: Type.Optional(previewDataSchema),
    /** Display names only; preset identifiers remain stable when renamed. */
    variantLabels: Type.Optional(Type.Record(idSchema, Type.String({ minLength: 1 }))),
    events: Type.Optional(Type.Array(eventDefinitionSchema)),
    expose: Type.Optional(exposeSchema),
    variants: Type.Optional(Type.Array(Type.Union([variantAxisSchema, variantPresetSchema]))),
    settings: Type.Optional(settingsSchema),
    fonts: Type.Optional(Type.Array(fontFamilySchema, { minItems: 1 })),
    icons: Type.Optional(Type.Array(iconDefinitionSchema, { minItems: 1 })),
    tokens: Type.Optional(tokenTreeSchema),
    styles: Type.Optional(styleBlockSchema),
    tokenInterface: Type.Optional(tokenInterfaceSchema),
    componentTokens: Type.Optional(componentTokensSchema),
    schemaCatalog: Type.Optional(schemaCatalogSchema),
    schemaUse: Type.Optional(componentSchemaUseSchema),
    root: nestedNodeSchema,
  };
}

/**
 * @deprecated Flat nested-document envelope. Prefer node-model `ProjectCatalog` for new persistence.
 */
export const documentFileSchema = withTokenDefs(
  Type.Object(documentProperties(kindSchema), {
    ...documentSchemaMeta,
    $id: DOCUMENT_SCHEMA_ID,
  }),
);

/** JSON Schema for one nested document. Kinds default to atom, component, section, and page. */
export function createDocumentSchema(options: DocumentSchemaOptions = {}) {
  if (!options.kinds && !options.schemaId) return documentFileSchema;
  return withTokenDefs(
    Type.Object(documentProperties(literalUnion(options.kinds ?? [...defaultKinds])), {
      ...documentSchemaMeta,
      $id: options.schemaId ?? DOCUMENT_SCHEMA_ID,
    }),
  );
}

export type FieldDefinition = Static<typeof fieldDefinitionSchema>;
export type ChildFieldOverrides = Record<string, Record<string, FieldValue>>;
export type PreviewData = Static<typeof previewDataSchema>;
export type EventDefinition = Static<typeof eventDefinitionSchema>;
export type EventBinding = Static<typeof eventBindingSchema>;
export type EventDataMapping = NonNullable<EventBinding['data']>[number];
export type EventDataSource = EventDataMapping['source'];
/** @deprecated Legacy parent-authored aliases; retained until child-contract inheritance migration. */
export type Expose = Static<typeof exposeSchema>;
/** @deprecated Legacy expose alias path; retained for document compatibility. */
export type ExposePath = Static<typeof exposePathSchema>;
export type VariantAxis = Static<typeof variantAxisSchema>;
export type DisplayOn = Static<typeof displayOnSchema>;
export type VariantRule = Static<typeof variantRuleSchema>;
export type Repeat = Static<typeof repeatSchema>;
export type VariantNodeOverride = Static<typeof variantNodeOverrideSchema>;
export type VariantInsertion = Static<typeof variantInsertionSchema>;
export type VariantOverrides = Static<typeof variantOverridesSchema>;
export type VariantPreset = Static<typeof variantPresetSchema>;
export type VariantDefinition = VariantAxis | VariantPreset;
export type Layout = Static<typeof layoutSchema>;
export type LayoutOverride = Static<typeof layoutOverrideSchema>;
export type AxisSize = Static<typeof axisSizeSchema>;
export type SizeValue = Static<typeof sizeValueSchema>;
export type Spacing = Static<typeof spacingSchema>;
export type SpacingBox = Static<typeof spacingBoxSchema>;
export type Margin = Static<typeof marginSchema>;
export type MarginBox = Static<typeof marginBoxSchema>;
export type StyleDeclarations = Record<string, string>;
export type StyleStates = Static<typeof styleStatesSchema>;
export type StyleLayer = Static<typeof styleLayerSchema>;
export type StyleRule = Static<typeof styleRuleSchema>;
export type StyleChild = Static<typeof styleChildSchema>;
export type StyleBlock = Static<typeof styleBlockSchema>;
export type TokenInterface = Static<typeof tokenInterfaceSchema>;
export type Binding = Static<typeof bindingSchema>;
export type NestedNode = Static<typeof nestedNodeSchema>;
export type DocumentSettings = Static<typeof settingsSchema>;
export type DocumentFile = Static<typeof documentFileSchema>;
export type {
  BasicSchemaType,
  ComponentSchemaUse,
  JsonSchema,
  NamedSchema,
  SchemaCatalog,
  SchemaFieldUse,
  SchemaTypeRef,
};
export type FontStyle = Static<typeof fontStyleSchema>;
export type FontFaceFile = Static<typeof fontFaceFileSchema>;
export type FontSource = Static<typeof fontSourceSchema>;
export type FontFamily = Static<typeof fontFamilySchema>;
export type IconDefinition = Static<typeof iconDefinitionSchema>;
export type Breakpoint = Static<typeof breakpointSchema>;

export function isVariantAxis(variant: VariantDefinition): variant is VariantAxis {
  return 'values' in variant;
}

export function isVariantPreset(variant: VariantDefinition): variant is VariantPreset {
  return !isVariantAxis(variant);
}

/** Viewports used when a document does not set its own breakpoints. */
export const defaultBreakpoints: Breakpoint[] = [
  { id: 'xs', label: 'Phone', minWidth: 375 },
  { id: 'sm', label: 'Tablet', minWidth: 768 },
  { id: 'md', label: 'Laptop', minWidth: 1024 },
  { id: 'lg', label: 'Desktop', minWidth: 1200 },
  { id: 'xl', label: 'Wide', minWidth: 1440 },
  { id: 'xxl', label: 'Ultra', minWidth: 1760 },
];

/** Name shown in the editor. A stored label wins; known defaults fill in when it is omitted. */
export function breakpointLabel(breakpoint: Pick<Breakpoint, 'id' | 'label'>): string {
  const label = breakpoint.label?.trim();
  if (label) return label;
  const known = defaultBreakpoints.find((item) => item.id === breakpoint.id)?.label;
  if (known) return known;
  return breakpoint.id.charAt(0).toUpperCase() + breakpoint.id.slice(1);
}

function literalUnion(values: readonly string[]): TSchema {
  const literals = values.map((value) => Type.Literal(value));
  const first = literals[0];
  if (!first) {
    throw new Error('A schema union needs at least one value');
  }
  if (literals.length === 1) return first;
  return Type.Union(literals as unknown as [TSchema, ...TSchema[]]);
}

/** Plain JSON Schema document for agents and Ajv, including the draft keyword. */
export function documentJsonSchema(options: DocumentSchemaOptions = {}): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...(createDocumentSchema(options) as unknown as Record<string, unknown>),
  };
}
