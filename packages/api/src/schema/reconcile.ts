import type {
  ComponentSchemaUse,
  DocumentFile,
  FieldDefinition,
  JsonSchema,
  SchemaCatalog,
} from '@facadeur/core';
import type { SchemaLibraryState } from './types.js';
import { BUILTIN_SCHEMAS } from './builtin-schemas.js';
import { schemaUseFromAssignment } from './assignment.js';

/** Reconcile an incoming JSON snapshot for validation; migration writes still happen later. */
export function reconcileLegacySchemaSnapshot(
  design: DocumentFile,
  documents: DocumentFile[],
  library: SchemaLibraryState = { schemas: [], assignments: {} },
): { design: DocumentFile; documents: DocumentFile[] } {
  const schemas = design.schemaCatalog?.schemas.map((schema) => ({ ...schema })) ?? [];
  const knownSchemaIds = new Set(schemas.map((schema) => schema.id));
  if (design.schemaCatalog === undefined) {
    for (const schema of library.schemas) {
      if (knownSchemaIds.has(schema.id)) continue;
      schemas.push(schema);
      knownSchemaIds.add(schema.id);
    }
  }
  const assignments = new Map(Object.entries(library.assignments));
  const reconciledDocuments =
    design.schemaCatalog === undefined
      ? documents.map((document) => {
          const assignment = assignments.get(document.id);
          if (!assignment) return document;
          const legacyUse = schemaUseFromAssignment(assignment);
          if (!legacyUse) return document;
          return {
            ...document,
            schemaUse: {
              ...legacyUse,
              ...(legacyUse.defaults !== undefined
                ? { defaults: legacyUse.defaults }
                : document.schemaUse?.defaults !== undefined
                  ? { defaults: document.schemaUse.defaults }
                  : {}),
            },
          };
        })
      : documents;
  addMissingReferencedSchemas(
    reconciledDocuments.flatMap((document) => (document.schemaUse ? [document.schemaUse] : [])),
    schemas,
    knownSchemaIds,
    library.schemas,
  );
  if (design.schemaCatalog === undefined) addMissingLegacyFields(documents, schemas);
  const schemaCatalog = { schemas };
  return {
    design: design.schemaCatalog === undefined ? { ...design, schemaCatalog } : design,
    documents: reconciledDocuments,
  };
}

/** Preserve fields from pre-catalog documents while the legacy catalog is migrated. */
export function addMissingLegacyFields(
  documents: readonly {
    schemaUse?: ComponentSchemaUse;
    fields?: FieldDefinition[];
  }[],
  schemas: SchemaCatalog['schemas'],
): void {
  const additions = new Map<string, Map<string, FieldDefinition>>();
  for (const document of documents) {
    const direct = document.schemaUse?.direct;
    if (direct?.kind !== 'schema' || !document.fields?.length) continue;
    const target = schemas.find((schema) => schema.id === direct.schemaId);
    if (!target) continue;
    const missing = additions.get(target.id) ?? new Map();
    const existing = new Set(Object.keys(target.schema.properties ?? {}));
    for (const field of document.fields) {
      if (!existing.has(field.name)) missing.set(field.name, field);
    }
    if (missing.size) additions.set(target.id, missing);
  }
  for (const schema of schemas) {
    const fields = additions.get(schema.id);
    if (!fields?.size) continue;
    schema.schema = {
      ...schema.schema,
      properties: {
        ...(schema.schema.properties ?? {}),
        ...Object.fromEntries([...fields].map(([name, field]) => [name, legacyFieldSchema(field)])),
      },
    };
  }
}

function legacyFieldSchema(field: FieldDefinition): JsonSchema {
  return {
    'x-facadeur-type': field.type,
    ...(field.default === undefined ? {} : { default: field.default }),
    ...(field.options ? { enum: [...field.options] } : {}),
    ...(field.items
      ? {
          items: {
            'x-facadeur-type': field.items.type,
            ...(field.items.options ? { enum: [...field.items.options] } : {}),
            ...(field.items.fields
              ? {
                  properties: Object.fromEntries(
                    field.items.fields.map((item) => [item.name, legacyFieldSchema(item)]),
                  ),
                  ...(field.items.fields.some((item) => item.required)
                    ? {
                        required: field.items.fields
                          .filter((item) => item.required)
                          .map((item) => item.name),
                      }
                    : {}),
                }
              : {}),
          },
        }
      : {}),
  };
}

export function addMissingReferencedSchemas(
  uses: readonly ComponentSchemaUse[],
  schemas: SchemaCatalog['schemas'],
  knownSchemaIds: Set<string>,
  localSchemas: SchemaCatalog['schemas'],
): void {
  const referenced = new Set<string>();
  for (const use of uses) {
    if (use.direct?.kind === 'schema') referenced.add(use.direct.schemaId);
    for (const field of use.fields ?? []) {
      if (field.type.kind === 'schema') referenced.add(field.type.schemaId);
    }
  }
  for (const id of referenced) {
    if (knownSchemaIds.has(id)) continue;
    const fallback =
      localSchemas.find((schema) => schema.id === id) ??
      BUILTIN_SCHEMAS.find((schema) => schema.id === id);
    if (!fallback) continue;
    schemas.push(fallback);
    knownSchemaIds.add(id);
  }
}
