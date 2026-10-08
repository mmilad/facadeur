import type { ComponentSchemaUse, DocumentFile, SchemaCatalog } from '@facadeur/core';
import type { EditorSession } from '../session';
import {
  addMissingLegacyFields,
  addMissingReferencedSchemas,
  reconcileLegacySchemaSnapshot as reconcileSnapshot,
} from '@facadeur/api/schema';
import { getSchemaLibrary, resetSchemaLibrary, type SchemaLibraryState } from './schema-library';
import { schemaUseFromAssignment } from './schema-use';

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

/** Browser-local recovery remains an editor concern; reconciliation is portable. */
export function reconcileLegacySchemaSnapshot(
  design: DocumentFile,
  documents: DocumentFile[],
  library: SchemaLibraryState = getSchemaLibrary(),
) {
  return reconcileSnapshot(design, documents, library);
}
