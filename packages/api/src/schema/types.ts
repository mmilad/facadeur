import type { ComponentSchemaUse, NamedSchema } from '@facadeur/core';

export interface SchemaLibraryState {
  schemas: NamedSchema[];
  assignments: Record<string, string | ComponentSchemaUse>;
}
