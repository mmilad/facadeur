'use client';

import { useMemo } from 'react';
import type { AppService } from '../../app-service';
import { catalogDefinitionDisplayName } from '../../domain/catalog/display-name';

export function CatalogCodeStage({
  app,
  generation,
}: {
  app: AppService;
  generation: number;
}) {
  const coreSnap = app.getCoreSnapshot();
  const definition = coreSnap.openDefinition;
  const title = definition
    ? catalogDefinitionDisplayName(coreSnap.catalog, definition)
    : 'Code';

  const buildConfig = useMemo(
    () => app.core.node.element.buildOpenDefinition(),
    [app, definition, generation],
  );

  const definitionJson = useMemo(
    () => (definition ? JSON.stringify(definition, null, 2) : ''),
    [definition],
  );

  const elementJson = useMemo(
    () => (buildConfig ? JSON.stringify(buildConfig, null, 2) : ''),
    [buildConfig],
  );

  if (!definition) {
    return (
      <section className="schema-stage code-stage eu-form" aria-label="Code">
        <p className="inspector-empty">Open a catalog asset to inspect generated output.</p>
      </section>
    );
  }

  return (
    <section className="schema-stage code-stage eu-form" aria-label="Code" data-testid="code-stage">
      <header className="schema-stage-head">
        <div>
          <p className="schema-stage-kicker">Catalog preview pipeline</p>
          <h1>Code</h1>
        </div>
        <p className="schema-stage-note">
          Resolved element config for {title}. React codegen from catalog definitions is not wired
          yet; this shows the declarative build output used by the stage.
        </p>
      </header>
      <div className="schema-stage-body">
        <section className="schema-card schema-code-preview" aria-labelledby="schema-code-title">
          <h2 id="schema-code-title">Element build config</h2>
          <pre>{elementJson || '—'}</pre>
        </section>
        <section className="schema-card schema-code-preview" aria-labelledby="schema-definition-json">
          <h2 id="schema-definition-json">Definition JSON</h2>
          <pre>{definitionJson}</pre>
        </section>
      </div>
    </section>
  );
}
