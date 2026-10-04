import type {
  ComponentSchemaUse,
  DocumentFile,
  FieldDefinition,
  JsonSchema,
  SchemaCatalog,
} from '@facadeur/core';
import type { EditorSession } from '../session.js';
import { BUILTIN_SCHEMAS } from './builtin-schemas.js';
import { getSchemaLibrary, resetSchemaLibrary, type SchemaLibraryState } from './schema-library.js';
import { schemaUseFromAssignment } from './schema-use.js';

/**
 * Copy the old browser-local schema library into its owning project documents.
 * When no project catalog exists, localStorage is the migration source of truth.
 * Once a catalog exists, it wins and migration only fills missing assignments
 * that reference schemas already in that catalog.
 */
export async function migrateLegacySchemaLibrary(
  session: EditorSession,
  persist?: () => Promise<void>,
): Promise<boolean> {
  const library = getSchemaLibrary();
  const stores = session.documentStores();
  const designId = session.getSnapshot().design.id;
  const designStore = stores.find((store) => store.getDocument().id === designId);
  if (!designStore) return false;

  const existingCatalog = designStore.getDocument().schemaCatalog;
  const hasCanonicalCatalog = existingCatalog !== undefined;
  const schemas = [...(existingCatalog?.schemas ?? [])];
  const knownSchemaIds = new Set(schemas.map((schema) => schema.id));
  if (!hasCanonicalCatalog) {
    for (const schema of library.schemas) {
      if (knownSchemaIds.has(schema.id)) continue;
      schemas.push(schema);
      knownSchemaIds.add(schema.id);
    }
    addMissingReferencedSchemas(
      stores.flatMap((store) => {
        const document = store.getDocument();
        return document.id === designId || !document.schemaUse ? [] : [document.schemaUse];
      }),
      schemas,
      knownSchemaIds,
      library.schemas,
    );
  }
  const catalog: SchemaCatalog = existingCatalog ?? { schemas };
  if (!hasCanonicalCatalog)
    addMissingLegacyFields(
      stores.map((store) => store.getDocument()),
      schemas,
    );

  const assignmentWrites: Array<{ store: (typeof stores)[number]; use: ComponentSchemaUse }> = [];
  let unresolvedLegacyAssignment = false;
  for (const [documentId, assignment] of Object.entries(library.assignments)) {
    const store = stores.find((candidate) => candidate.getDocument().id === documentId);
    if (!store || documentId === designId) continue;
    const currentUse = store.getDocument().schemaUse;
    if (hasCanonicalCatalog && currentUse) continue;
    const legacyUse = schemaUseFromAssignment(assignment);
    if (!legacyUse) continue;
    if (hasCanonicalCatalog && !referencesKnownSchemas(legacyUse, knownSchemaIds)) {
      unresolvedLegacyAssignment = true;
      continue;
    }
    const use: ComponentSchemaUse = {
      ...legacyUse,
      ...(legacyUse.defaults !== undefined
        ? { defaults: legacyUse.defaults }
        : currentUse?.defaults !== undefined
          ? { defaults: currentUse.defaults }
          : {}),
    };
    assignmentWrites.push({ store, use });
  }

  const writeCatalog = () => {
    if (
      !hasCanonicalCatalog &&
      JSON.stringify(designStore.getDocument().schemaCatalog ?? null) !== JSON.stringify(catalog)
    ) {
      session.executeDesign({ type: 'setSchemaCatalog', schemaCatalog: catalog });
    }
  };
  // Schema references must resolve when each document command validates. Write the
  // owning catalog first, then migrate assignments that refer to it.
  writeCatalog();
  for (const { store, use } of assignmentWrites)
    session.executeDocument(store.getDocument().id, { type: 'setSchemaUse', schemaUse: use });

  const assignmentWritesCommitted = assignmentWrites.every(
    ({ store, use }) => JSON.stringify(store.getDocument().schemaUse) === JSON.stringify(use),
  );
  if (!assignmentWritesCommitted) return false;

  const catalogCommitted =
    JSON.stringify(designStore.getDocument().schemaCatalog) === JSON.stringify(catalog);
  if (!catalogCommitted || unresolvedLegacyAssignment) return false;

  // Controller readback only confirms that the mutation was applied in this tab.
  // Keep the recovery copy until the explicit JSON save succeeds.
  if (!persist) return false;
  await persist();

  resetSchemaLibrary();
  return true;
}

function referencesKnownSchemas(use: ComponentSchemaUse, known: Set<string>): boolean {
  if (use.direct?.kind === 'schema' && !known.has(use.direct.schemaId)) return false;
  return (use.fields ?? []).every(
    (field) => field.type.kind !== 'schema' || known.has(field.type.schemaId),
  );
}

/** Reconcile an incoming JSON snapshot for validation; migration writes still happen later. */
export function reconcileLegacySchemaSnapshot(
  design: DocumentFile,
  documents: DocumentFile[],
  library: SchemaLibraryState = getSchemaLibrary(),
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
function addMissingLegacyFields(
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

function addMissingReferencedSchemas(
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
