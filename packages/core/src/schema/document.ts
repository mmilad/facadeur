import type { Static } from '@sinclair/typebox';
import type { FontFamilyDefinition } from '@facadeur/domain';
import { defaultBreakpointIds } from './default-breakpoint-ids';
import { childFieldPathSchema } from './common';
import {
  fieldDefinitionSchema,
  fieldTypeSchema,
  fieldTypes,
  fieldValueSchema,
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
} from './fonts';
import {
  designTokenSetSchema as tokenTreeSchema,
  tokenTypeSchema,
  tokenTypes,
  type TokenType,
} from './design-tokens';
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
import {
  styleBlockSchema,
  styleChildSchema,
  styleLayerSchema,
  styleRuleSchema,
  styleStatesSchema,
  tokenInterfaceSchema,
} from './style';
import type { JsonSchema } from './contract';

export {
  fieldTypes,
  type FieldType,
  childFieldPathSchema,
  type FieldValue,
  fieldValueSchema,
  fieldTypeSchema,
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
  previewDataSchema,
  settingsSchema,
};

export type FieldDefinition = Static<typeof fieldDefinitionSchema>;
export type ChildFieldOverrides = Record<string, Record<string, FieldValue>>;
export type PreviewData = Static<typeof previewDataSchema>;
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
export type { JsonSchema };
export type { IconDefinition } from '@facadeur/domain';
export type FontStyle = Static<typeof fontStyleSchema>;
export type FontFaceFile = Static<typeof fontFaceFileSchema>;
export type FontSource = Static<typeof fontSourceSchema>;
export type FontFamily = FontFamilyDefinition;
export type FontFamilyValue = Static<typeof fontFamilySchema>;
export type Breakpoint = Static<typeof breakpointSchema>;

/** Viewports used when a document does not set its own breakpoints. */
export const defaultBreakpoints: Breakpoint[] = [
  { uuid: defaultBreakpointIds.phone, label: 'Phone', minWidth: 375 },
  { uuid: defaultBreakpointIds.tablet, label: 'Tablet', minWidth: 768 },
  { uuid: defaultBreakpointIds.laptop, label: 'Laptop', minWidth: 1024 },
  { uuid: defaultBreakpointIds.desktop, label: 'Desktop', minWidth: 1200 },
  { uuid: defaultBreakpointIds.wide, label: 'Wide', minWidth: 1440 },
  { uuid: defaultBreakpointIds.ultra, label: 'Ultra', minWidth: 1760 },
];

/** Display name for a configured viewport. */
export function breakpointLabel(breakpoint: Pick<Breakpoint, 'uuid' | 'label'>): string {
  return breakpoint.label;
}
