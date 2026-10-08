import { Type } from '@sinclair/typebox';
import { breakpointSchema, fontFamilySchema } from '../fonts';
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
    /** Top-level DTCG groups; nested `$value` shape validated via `projectCatalogJsonSchema` + Ajv or `@facadeur/tokens`. */
    tokens: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    fonts: Type.Optional(Type.Array(fontFamilySchema, { minItems: 1 })),
    props: Type.Optional(Type.Record(uuidSchema, designPropSchema)),
    globalStyles: Type.Optional(globalStylesSchema),
  },
  { additionalProperties: false },
);

export type { ProjectCatalog as ProjectCatalogModel } from '@facadeur/domain';
