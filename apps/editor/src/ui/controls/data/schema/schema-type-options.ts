import { basicTypeOptions } from '../../../../domain/schema/schema-use';
import type { NamedSchema } from '@facadeur/core';

export function schemaTypeOptions(schemas: NamedSchema[]): { value: string; label: string }[] {
  return [
    ...basicTypeOptions(),
    ...schemas.map((schema) => ({ value: `schema:${schema.id}`, label: schema.name })),
  ];
}
