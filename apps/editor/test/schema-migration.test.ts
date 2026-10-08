/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { createEditorSession } from '../src/domain/session';
import {
  migrateLegacySchemaLibrary,
  reconcileLegacySchemaSnapshot,
} from '../src/domain/schema/migrate-legacy-schema-library';
import {
  assignLibrarySchema,
  createLibrarySchema,
  getSchemaLibrary,
  reloadSchemaLibrary,
  resetSchemaLibrary,
  updateLibrarySchema,
} from '../src/domain/schema/schema-library';

const input: DocumentFile = {
  version: 1,
  id: 'legacy-input',
  name: 'Input',
  kind: 'atom',
  fields: [{ name: 'value', type: 'text' }],
  root: { id: 'root', type: 'text', text: 'input' },
};

describe('legacy schema library migration', () => {
  beforeEach(() => resetSchemaLibrary());
  afterEach(() => resetSchemaLibrary());

  it('commits catalog and assignments before clearing legacy storage after persistence', async () => {
    const schema = createLibrarySchema('Reusable input');
    assignLibrarySchema(input.id, schema.id);
    const session = createEditorSession({
      documents: [input],
      design: createProjectTemplateDocument(),
    });

    expect(await migrateLegacySchemaLibrary(session, async () => {})).toBe(true);
    const snap = session.getSnapshot();
    expect(snap.design.schemaCatalog?.schemas).toContainEqual(schema);
    expect(
      session
        .documentStores()
        .find((store) => store.getDocument().id === input.id)
        ?.getDocument(),
    ).toMatchObject({ schemaUse: { direct: { kind: 'schema', schemaId: schema.id } } });
    expect(localStorage.getItem('facadeur.schema-library.v1')).toBeNull();
    expect(snap.designDirty).toBe(true);
    session.destroy();
  });

  it('is idempotent after the legacy store has been cleared', async () => {
    const schema = createLibrarySchema('Reusable input');
    assignLibrarySchema(input.id, schema.id);
    const session = createEditorSession({
      documents: [input],
      design: createProjectTemplateDocument(),
    });
    expect(await migrateLegacySchemaLibrary(session, async () => {})).toBe(true);
    const before = session.documentStores().map((store) => store.getDocument());
    expect(await migrateLegacySchemaLibrary(session, async () => {})).toBe(true);
    expect(session.documentStores().map((store) => store.getDocument())).toEqual(before);
    session.destroy();
  });

  it('keeps the legacy recovery copy until durable persistence is confirmed', async () => {
    const schema = createLibrarySchema('Recoverable input');
    assignLibrarySchema(input.id, schema.id);
    const session = createEditorSession({
      documents: [input],
      design: createProjectTemplateDocument(),
    });

    expect(await migrateLegacySchemaLibrary(session)).toBe(false);
    expect(localStorage.getItem('facadeur.schema-library.v1')).not.toBeNull();
    session.destroy();
  });

  it('reconciles stale document assignments from legacy storage and retains durable defaults when no catalog exists', async () => {
    const schema = createLibrarySchema('Current input');
    schema.schema = { type: 'object', properties: { value: { type: 'string' } } };
    assignLibrarySchema(input.id, schema.id);
    const staleDocument: DocumentFile = {
      ...input,
      schemaUse: {
        direct: { kind: 'schema', schemaId: 'stale-schema-id' },
        defaults: { value: 'Kept example' },
      },
    };
    const session = createEditorSession(
      reconcileLegacySchemaSnapshot(createProjectTemplateDocument(), [staleDocument]),
    );

    expect(await migrateLegacySchemaLibrary(session, async () => {})).toBe(true);
    const migrated = session.documentStores().find((store) => store.getDocument().id === input.id);
    expect(migrated?.getDocument().schemaUse).toEqual({
      direct: { kind: 'schema', schemaId: schema.id },
      defaults: { value: 'Kept example' },
    });
    session.destroy();
  });

  it('reconciles incoming project JSON before strict catalog validation when no canonical catalog exists', () => {
    const schema = createLibrarySchema('Current input');
    assignLibrarySchema(input.id, schema.id);
    const staleDocument: DocumentFile = {
      ...input,
      schemaUse: { direct: { kind: 'schema', schemaId: 'stale-schema-id' } },
    };
    const { design, documents } = reconcileLegacySchemaSnapshot(createProjectTemplateDocument(), [
      staleDocument,
    ]);

    expect(design.schemaCatalog?.schemas).toContainEqual(schema);
    expect(documents[0]?.schemaUse).toEqual({
      direct: { kind: 'schema', schemaId: schema.id },
    });
    expect(localStorage.getItem('facadeur.schema-library.v1')).not.toBeNull();

    const canonicalDesign = {
      ...createProjectTemplateDocument(),
      schemaCatalog: { schemas: [{ id: 'kept', name: 'Kept', schema: { type: 'string' } }] },
    };
    const canonical = reconcileLegacySchemaSnapshot(canonicalDesign, [staleDocument]);
    expect(canonical.design).toBe(canonicalDesign);
    expect(canonical.documents[0]).toBe(staleDocument);
  });

  it('passes the reconciled catalog through the design document and resolves persisted built-in uses', () => {
    const card: DocumentFile = {
      ...input,
      id: 'card',
      schemaUse: { direct: { kind: 'schema', schemaId: 'card' } },
    };
    const reconciled = reconcileLegacySchemaSnapshot(createProjectTemplateDocument(), [card]);

    expect(reconciled.design.schemaCatalog?.schemas.some((schema) => schema.id === 'card')).toBe(
      true,
    );
    expect(() =>
      validateCatalog(reconciled.documents, { schemaCatalog: reconciled.design.schemaCatalog }),
    ).not.toThrow();
  });

  it('restores omitted legacy fields for validation before the schema catalog is persisted', () => {
    reloadSchemaLibrary();
    expect(
      updateLibrarySchema('textarea', {
        type: 'object',
        properties: { value: { type: 'string' } },
      }),
    ).toEqual([]);
    expect(
      getSchemaLibrary().schemas.find((schema) => schema.id === 'textarea')?.schema.properties,
    ).not.toHaveProperty('label');
    const textarea: DocumentFile = {
      ...input,
      id: 'textarea',
      fields: [{ name: 'label', type: 'text' }],
      schemaUse: { direct: { kind: 'schema', schemaId: 'textarea' } },
    };
    const parent: DocumentFile = {
      version: 1,
      id: 'form-parent',
      name: 'Form parent',
      kind: 'component',
      fields: [{ name: 'label', type: 'text' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'data-textarea',
            type: 'instance',
            component: 'textarea',
            fieldBindings: { label: 'label' },
          },
        ],
      },
    };

    const reconciled = reconcileLegacySchemaSnapshot(createProjectTemplateDocument(), [
      textarea,
      parent,
    ]);
    const resolvedTextarea = reconciled.design.schemaCatalog?.schemas.find(
      (schema) => schema.id === 'textarea',
    );
    expect(resolvedTextarea?.schema.properties?.label).toEqual({
      'x-facadeur-type': 'text',
    });
    expect(() =>
      validateCatalog(reconciled.documents, { schemaCatalog: reconciled.design.schemaCatalog }),
    ).not.toThrow();

    const canonical = reconcileLegacySchemaSnapshot(
      {
        ...reconciled.design,
        schemaCatalog: {
          schemas: [
            {
              id: 'textarea',
              name: 'Textarea',
              schema: { type: 'object', properties: { value: { type: 'string' } } },
            },
          ],
        },
      },
      [textarea, parent],
    );
    expect(() =>
      validateCatalog(canonical.documents, { schemaCatalog: canonical.design.schemaCatalog }),
    ).toThrow('binds unknown field "label" on "textarea"');
  });

  it('keeps existing project assignments when a canonical design catalog already exists', async () => {
    const legacySchema = createLibrarySchema('Legacy input');
    assignLibrarySchema(input.id, legacySchema.id);
    const canonicalSchema = {
      id: 'canonical-schema',
      name: 'Canonical',
      schema: { type: 'object', properties: { value: { type: 'string' } } },
    };
    const canonicalDocument: DocumentFile = {
      ...input,
      schemaUse: { direct: { kind: 'schema', schemaId: canonicalSchema.id } },
    };
    const design = {
      ...createProjectTemplateDocument(),
      schemaCatalog: { schemas: [canonicalSchema] },
    };
    const session = createEditorSession({ documents: [canonicalDocument], design });

    expect(await migrateLegacySchemaLibrary(session, async () => {})).toBe(true);
    const migrated = session.documentStores().find((store) => store.getDocument().id === input.id);
    expect(migrated?.getDocument().schemaUse).toEqual(canonicalDocument.schemaUse);
    session.destroy();
  });
});
