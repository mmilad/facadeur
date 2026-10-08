import type { EditorSession, EditorSnapshot } from '../../domain/session';
import type { ComponentSchemaUse, SchemaTypeSelection } from '../../domain/schema/schema-use';
import { SchemaPreviewForm } from './SchemaPreviewForm';
import { SchemaTypeSelector } from '../controls/data/SchemaTypeSelector';

export function SchemaUseControl({
  session,
  snap,
  onOpenSchemas,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  onOpenSchemas: () => void;
}) {
  const library = snap.design.schemaCatalog ?? { schemas: [] };
  const use = snap.document.schemaUse ?? null;

  function commitSelection(next: SchemaTypeSelection | null) {
    const schemaUse: ComponentSchemaUse | null = next
      ? use?.defaults === undefined
        ? next
        : { ...next, defaults: use.defaults }
      : use?.defaults === undefined
        ? null
        : { defaults: use.defaults };
    session.execute({ type: 'setSchemaUse', schemaUse });
  }

  const namedSchemas = library.schemas.map((schema) => ({
    id: schema.id,
    name: schema.name,
    schema: schema.schema,
  }));

  return (
    <div className="schema-use">
      <SchemaTypeSelector
        name="schema-use"
        value={use}
        schemas={library.schemas}
        onChange={commitSelection}
        onOpenSchemas={onOpenSchemas}
        helperText="Pick a type or named fields for defaults. Props below are still this document’s fields."
      />
      <SchemaPreviewForm
        session={session}
        use={use}
        schemas={namedSchemas}
        fields={snap.documentScopeFields}
      />
    </div>
  );
}
