import { Type } from '@sinclair/typebox';
import { breakpointSchema } from '../fonts';
import { designTokenSetSchema } from '../design-tokens';
import { styleBlockSchema, tokenInterfaceSchema } from '../style';
import { nodeDefinitionSchema } from './node-definition';
import { uuidSchema } from './uuid';

const definitionMapSchema = Type.Record(uuidSchema, nodeDefinitionSchema);

const designPropSchema = Type.Object(
  {
    uuid: uuidSchema,
    name: Type.String({ minLength: 1 }),
    value: Type.String(),
  },
  { additionalProperties: false },
);

export const globalStylesSchema = Type.Object(
  {
    block: Type.Optional(styleBlockSchema),
    tokenInterface: Type.Optional(tokenInterfaceSchema),
    breakpoints: Type.Optional(Type.Array(breakpointSchema, { minItems: 1 })),
  },
  { additionalProperties: false },
);

export const projectCatalogSchema = Type.Object(
  {
    atoms: definitionMapSchema,
    components: definitionMapSchema,
    pages: definitionMapSchema,
    schemas: Type.Optional(Type.Record(uuidSchema, Type.Record(Type.String(), Type.Unknown()))),
    /** Canonical UUID-keyed token families, including fonts. */
    tokens: Type.Optional(designTokenSetSchema),
    props: Type.Optional(Type.Record(uuidSchema, designPropSchema)),
    globalStyles: Type.Optional(globalStylesSchema),
  },
  { additionalProperties: false },
);

export type { ProjectCatalogModel } from '@facadeur/domain';
