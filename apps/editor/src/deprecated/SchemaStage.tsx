import type { EditorSession, EditorSnapshot } from '../../domain/session';
import { variantLabel } from '../../domain/edits/variant-edit';
import { ComponentEvents } from '../sidebar/properties/content/component/ComponentEvents';
import { ownsComponentFeatures } from '../sidebar/properties/content/component/owns-component-features';
import { SchemaUseControl } from './SchemaUseControl';

/**
 * The schema surface edits the open document's structural contract. It uses
 * the canonical document even while a named variant is active: variants alter
 * presentation and instance values, not the component schema.
 */
export function SchemaStage({
  session,
  snap,
  onOpenSchemas,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  onOpenSchemas: () => void;
}) {
  const document = snap.document;
  const hasSchema =
    ownsComponentFeatures(document.kind) || document.kind === 'section' || document.kind === 'page';
  const schemaOwner =
    document.kind === 'section' ? 'Section' : document.kind === 'page' ? 'Page' : 'Component';

  return (
    <section className="schema-stage eu-form" aria-label="Schema" data-testid="schema-stage">
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Shared {schemaOwner.toLowerCase()} contract</p>
          <h1>Schema</h1>
        </div>
        <p className="schema-stage-note">
          {snap.activeVariantName
            ? `Editing ${variantLabel(document, snap.activeVariantName)}; schema stays shared with the base document.`
            : document.kind === 'page'
              ? 'Define page events, their data contracts and native targets.'
              : `Choose a shared schema and set the defaults this ${schemaOwner.toLowerCase()} contributes to instances.`}
        </p>
      </header>
      <div className="schema-stage-body">
        {hasSchema ? (
          <div className="schema-stage-grid">
            <section
              className="schema-card schema-definition-card"
              aria-labelledby="schema-definition-title"
            >
              <h2 id="schema-definition-title">{schemaOwner} definition</h2>
              {document.kind !== 'page' ? (
                <SchemaUseControl session={session} snap={snap} onOpenSchemas={onOpenSchemas} />
              ) : null}
              <ComponentEvents session={session} snap={snap} />
            </section>
          </div>
        ) : (
          <div className="schema-card schema-card-empty">
            <h2>Document schema</h2>
            <p className="inspector-empty">
              This document type has no component definitions. Open a component to edit fields,
              events, and exposed paths.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
