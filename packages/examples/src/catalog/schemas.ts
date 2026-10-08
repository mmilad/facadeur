import type { ProjectCatalog } from '@facadeur/domain';
import { schema, schemaUuid } from '../image/schema';

export const schemas = {
  [schemaUuid]: schema,
} satisfies NonNullable<ProjectCatalog['schemas']>;
