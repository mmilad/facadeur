import { useMemo } from 'react';
import { codePreview } from '../../domain/code-preview.js';
import type { EditorSession, EditorSnapshot } from '../../domain/session.js';
import { variantLabel } from '../../domain/variant-edit.js';
import { ComponentEvents } from '../sidebar/properties/content/ComponentEvents.js';
import { ComponentExpose } from '../sidebar/properties/content/ComponentExpose.js';
import { ComponentFields } from '../sidebar/properties/content/ComponentFields.js';
import { ComponentVariants } from '../sidebar/properties/content/ComponentVariants.js';
import { ownsComponentFeatures } from '../sidebar/properties/content/owns-component-features.js';

/**
 * The schema surface edits the open document's structural contract. It uses
 * the canonical document even while a named variant is active: variants alter
 * presentation and instance values, not the component schema.
 */
export function SchemaStage({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const document = snap.document;
  const hasSchema = ownsComponentFeatures(document.kind);
  const generatedCode = useMemo(
    () =>
      codePreview({
        documents: session.boardDocuments(),
        design: session.designInput(),
        documentId: document.id,
      }),
    [session, snap],
  );

  return (
    <section className="schema-stage eu-form" aria-label="Schema" data-testid="schema-stage">
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Shared component contract</p>
          <h1>Schema</h1>
        </div>
        <p className="schema-stage-note">
          {snap.activeVariantName
            ? `Editing ${variantLabel(document, snap.activeVariantName)}; schema stays shared with the base document.`
            : 'Define the fields, events, and exposed API for this document.'}
        </p>
      </header>
      <div className="schema-stage-body">
        {hasSchema ? (
          <div className="schema-stage-grid">
            <section
              className="schema-card schema-definition-card"
              aria-labelledby="schema-definition-title"
            >
              <h2 id="schema-definition-title">Component definition</h2>
              <h3>Props</h3>
              <ComponentFields session={session} snap={snap} />
              <ComponentEvents session={session} snap={snap} />
              <ComponentExpose session={session} snap={snap} />
              {document.variants.length ? (
                <details className="fold schema-legacy-variants">
                  <summary>Legacy variant axes</summary>
                  <ComponentVariants session={session} snap={snap} />
                </details>
              ) : null}
            </section>
            <section
              className="schema-card schema-code-preview"
              aria-labelledby="schema-code-title"
            >
              <h2 id="schema-code-title">React preview</h2>
              {generatedCode.error ? (
                <p className="notice notice-error">{generatedCode.error}</p>
              ) : (
                <pre>{generatedCode.source}</pre>
              )}
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
