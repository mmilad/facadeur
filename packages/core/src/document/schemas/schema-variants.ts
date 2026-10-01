import { Type } from '@sinclair/typebox';
import {
  childFieldPathSchema,
  dataPathSchema,
  idSchema,
  nodeTargetSchema,
  variantUnsetPathSchema,
} from './schema-common.js';
import {
  bindingSchema,
  displayOnSchema,
  eventBindingSchema,
  fieldValueSchema,
  repeatSchema,
  variantRuleSchema,
} from './schema-fields.js';
import { layoutSchema } from './schema-layout.js';
import { nestedNodeSchema } from './schema-nodes.js';
import { styleBlockSchema } from './schema-style.js';

export const variantAxisSchema = Type.Object(
  {
    name: idSchema,
    values: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    default: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const variantNodeOverrideSchema = Type.Object(
  {
    text: Type.Optional(Type.String()),
    src: Type.Optional(Type.String()),
    alt: Type.Optional(Type.String()),
    attributes: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.String())),
    fields: Type.Optional(Type.Record(idSchema, fieldValueSchema)),
    childFields: Type.Optional(
      Type.Record(childFieldPathSchema, Type.Record(idSchema, fieldValueSchema)),
    ),
    fieldBindings: Type.Optional(Type.Record(idSchema, dataPathSchema)),
    variants: Type.Optional(Type.Record(idSchema, Type.String())),
    variantRules: Type.Optional(Type.Array(variantRuleSchema)),
    repeat: Type.Optional(repeatSchema),
    layout: Type.Optional(layoutSchema),
    bindings: Type.Optional(Type.Array(bindingSchema)),
    eventBindings: Type.Optional(Type.Array(eventBindingSchema)),
    style: Type.Optional(Type.Record(Type.String({ minLength: 1 }), Type.String())),
    displayOn: Type.Optional(displayOnSchema),
    unset: Type.Optional(Type.Array(variantUnsetPathSchema, { uniqueItems: true })),
  },
  { additionalProperties: false },
);

export const variantInsertionSchema = Type.Object(
  {
    parent: nodeTargetSchema,
    index: Type.Optional(Type.Integer({ minimum: 0 })),
    node: Type.Ref(nestedNodeSchema),
  },
  { additionalProperties: false },
);

export const variantOverridesSchema = Type.Object(
  {
    fields: Type.Optional(Type.Record(idSchema, fieldValueSchema)),
    /** Sparse style block merged onto the default styles for this preset. */
    styles: Type.Optional(styleBlockSchema),
    /** Optional field defaults can be explicitly removed without duplicating the base definition. */
    unsetFields: Type.Optional(Type.Array(idSchema, { uniqueItems: true })),
    nodes: Type.Optional(Type.Record(nodeTargetSchema, variantNodeOverrideSchema)),
    removed: Type.Optional(Type.Array(nodeTargetSchema, { uniqueItems: true })),
    insertions: Type.Optional(Type.Array(variantInsertionSchema)),
  },
  { additionalProperties: false },
);

export const variantPresetSchema = Type.Object(
  {
    name: idSchema,
    overrides: Type.Optional(variantOverridesSchema),
  },
  { additionalProperties: false },
);
