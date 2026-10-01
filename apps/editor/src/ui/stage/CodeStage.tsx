import { useMemo } from 'react';
import { codePreview } from '../../domain/assets/code-preview.js';
import type { EditorSession, EditorSnapshot } from '../../domain/session.js';

/** Read-only React output for the open component. */
export function CodeStage({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const document = snap.document;
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
    <section className="schema-stage code-stage eu-form" aria-label="Code" data-testid="code-stage">
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Generated component</p>
          <h1>Code</h1>
        </div>
        <p className="schema-stage-note">
          React output for {document.name}. The facadeur document is the source of truth.
        </p>
      </header>
      <div className="schema-stage-body">
        <section className="schema-card schema-code-preview" aria-labelledby="schema-code-title">
          <h2 id="schema-code-title">React preview</h2>
          {generatedCode.error ? (
            <p className="notice notice-error">{generatedCode.error}</p>
          ) : (
            <pre>{generatedCode.source}</pre>
          )}
        </section>
      </div>
    </section>
  );
}
