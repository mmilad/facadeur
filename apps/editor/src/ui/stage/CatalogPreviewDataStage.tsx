'use client';

import type { AppService } from '../../app-service';
import { catalogDefinitionDisplayName } from '../../domain/catalog/display-name';
import type { EditorSession } from '../../domain/session';
import { CatalogPreviewFields } from './CatalogPreviewFields';

/** Edits definition-level preview defaults (`config.previewData.fields`). */
export function CatalogPreviewDataStage({
  app,
  session,
}: {
  app: AppService;
  session: EditorSession;
}) {
  const coreSnap = app.getCoreSnapshot();
  const definition = coreSnap.openDefinition;
  const { fields } = app.core.node.config.inspectorInputs();
  const previewFields = definition?.config?.previewData?.fields ?? {};

  if (!definition) {
    return (
      <section className="schema-stage preview-data-stage eu-form" aria-label="Preview data">
        <p className="inspector-empty">Open a catalog asset to edit preview defaults.</p>
      </section>
    );
  }

  const title = catalogDefinitionDisplayName(coreSnap.catalog, definition);

  return (
    <section
      className="schema-stage preview-data-stage eu-form"
      aria-label="Preview data"
      data-testid="preview-data-stage"
    >
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Catalog defaults</p>
          <h1>Preview data</h1>
        </div>
        <p className="schema-stage-note">
          Default field values for {title} in the editor and stage. You can also edit these on the
          Schema tab.
        </p>
      </header>
      <div className="schema-stage-body">
        <div className="schema-stage-grid">
          <section className="schema-card preview-data-slot" data-testid="preview-data-slot">
            <h2>Preview values</h2>
            <CatalogPreviewFields
              fields={fields}
              previewFields={previewFields}
              onWrite={(field, value) => void app.patchPreviewField(field.name, value)}
              onInvalid={(message) => session.setNotice(message, 'error')}
            />
          </section>
        </div>
      </div>
    </section>
  );
}
