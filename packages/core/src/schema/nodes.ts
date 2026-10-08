import { Type } from '@sinclair/typebox';
import { childFieldPathSchema, dataPathSchema, idSchema, stringMapSchema } from './common';
import {
  bindingSchema,
  displayOnSchema,
  eventBindingSchema,
  exposeSchema,
  fieldValueSchema,
  repeatSchema,
  variantRuleSchema,
} from './fields';
import { layoutSchema } from './layout';

const sharedNodeProps = {
  id: idSchema,
  name: Type.Optional(Type.String({ minLength: 1 })),
  styleName: Type.Optional(Type.String({ pattern: '^[A-Za-z_][A-Za-z0-9_-]*$' })),
  classes: Type.Optional(Type.Array(Type.String({ minLength: 1, pattern: '^\\S+$' }))),
  tag: Type.Optional(Type.String({ pattern: '^[A-Za-z][A-Za-z0-9-]*$' })),
  attributes: Type.Optional(stringMapSchema),
  displayOn: Type.Optional(displayOnSchema),
  layout: Type.Optional(layoutSchema),
  bindings: Type.Optional(Type.Array(bindingSchema)),
  eventBindings: Type.Optional(Type.Array(eventBindingSchema)),
  style: Type.Optional(stringMapSchema),
};

export const nestedNodeSchema = Type.Recursive(
  (Self) =>
    Type.Union([
      Type.Object(
        {
          ...sharedNodeProps,
          type: Type.Literal('frame'),
          repeat: Type.Optional(repeatSchema),
          children: Type.Optional(Type.Array(Self)),
        },
        { additionalProperties: false },
      ),
      Type.Object(
        {
          ...sharedNodeProps,
          type: Type.Literal('text'),
          text: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
      Type.Object(
        {
          ...sharedNodeProps,
          type: Type.Literal('image'),
          src: Type.Optional(Type.String()),
          alt: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
      Type.Object(
        {
          id: idSchema,
          name: Type.Optional(Type.String({ minLength: 1 })),
          styleName: Type.Optional(Type.String({ pattern: '^[A-Za-z_][A-Za-z0-9_-]*$' })),
          classes: Type.Optional(Type.Array(Type.String({ minLength: 1, pattern: '^\\S+$' }))),
          layout: Type.Optional(layoutSchema),
          displayOn: Type.Optional(displayOnSchema),
          type: Type.Literal('instance'),
          component: idSchema,
          fields: Type.Optional(Type.Record(idSchema, fieldValueSchema)),
          childFields: Type.Optional(
            Type.Record(childFieldPathSchema, Type.Record(idSchema, fieldValueSchema)),
          ),
          forwardFields: Type.Optional(Type.Boolean()),
          switchCase: Type.Optional(Type.String({ minLength: 1 })),
          fieldBindings: Type.Optional(Type.Record(idSchema, dataPathSchema)),
          variants: Type.Optional(Type.Record(idSchema, Type.String())),
          variantRules: Type.Optional(Type.Array(variantRuleSchema)),
          expose: Type.Optional(exposeSchema),
        },
        { additionalProperties: false },
      ),
      Type.Object(
        {
          id: idSchema,
          name: Type.Optional(Type.String({ minLength: 1 })),
          styleName: Type.Optional(Type.Never()),
          classes: Type.Optional(Type.Never()),
          tag: Type.Optional(Type.Never()),
          attributes: Type.Optional(Type.Never()),
          displayOn: Type.Optional(Type.Never()),
          layout: Type.Optional(Type.Never()),
          bindings: Type.Optional(Type.Never()),
          eventBindings: Type.Optional(Type.Never()),
          style: Type.Optional(Type.Never()),
          type: Type.Literal('repeater'),
          children: Type.Optional(Type.Array(Self)),
        },
        { additionalProperties: false },
      ),
      Type.Object(
        {
          id: idSchema,
          name: Type.Optional(Type.String({ minLength: 1 })),
          styleName: Type.Optional(Type.Never()),
          classes: Type.Optional(Type.Never()),
          tag: Type.Optional(Type.Never()),
          attributes: Type.Optional(Type.Never()),
          displayOn: Type.Optional(Type.Never()),
          layout: Type.Optional(Type.Never()),
          bindings: Type.Optional(Type.Never()),
          eventBindings: Type.Optional(Type.Never()),
          style: Type.Optional(Type.Never()),
          type: Type.Literal('switch'),
          children: Type.Optional(Type.Array(Self)),
        },
        { additionalProperties: false },
      ),
    ]),
  { $id: 'https://github.com/mmilad/facadeur/schema/nested-node' },
);
