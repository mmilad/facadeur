import type { Binding, EventBinding, FlatNode } from '@facadeur/core';
import { useMemo } from 'react';
import type { EditorSession, EditorSnapshot } from '../../domain/session.js';
import { variantLabel } from '../../domain/variant-edit.js';
import { generateReact } from '../../../../../packages/codegen-react/src/generate.js';
import { BindingsEditorControl, EventBindingsEditorControl } from '../controls/data/index.js';
import { Field, Select } from '../form/index.js';
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
  const elementDocument = snap.activeDocument;
  const selectableNodes = Object.values(elementDocument.nodes).filter(
    (node): node is Exclude<FlatNode, { type: 'instance' }> => node.type !== 'instance',
  );
  const selectedNode = snap.selectedNodeId
    ? elementDocument.nodes[snap.selectedNodeId]
    : elementDocument.nodes[elementDocument.rootId];
  const selectedElement = selectedNode?.type === 'instance' ? undefined : selectedNode;
  const hasSchema = ownsComponentFeatures(document.kind);
  const generatedCode = useMemo(() => codePreview(session, snap), [session, snap]);

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
            <section className="schema-card" aria-labelledby="schema-element-title">
              <h2 id="schema-element-title">Element bindings</h2>
              {selectableNodes.length > 0 ? (
                <Field label="Element">
                  <Select
                    name="schema-node"
                    value={selectedElement?.id ?? elementDocument.rootId}
                    options={selectableNodes.map((node) => ({
                      value: node.id,
                      label: nodeLabel(node),
                    }))}
                    onCommit={(next) => session.selectNode(next)}
                  />
                </Field>
              ) : null}
              {selectedElement ? (
                <ElementBindings session={session} snap={snap} node={selectedElement} />
              ) : (
                <p className="inspector-empty">Select an element with editable bindings.</p>
              )}
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

function codePreview(
  session: EditorSession,
  snap: EditorSnapshot,
): { source?: string; error?: string } {
  try {
    const files = generateReact({
      documents: session.boardDocuments(),
      design: session.designInput(),
    }).ui;
    const source = files.find(
      (file) =>
        file.path.startsWith('components/') &&
        file.contents.includes(`data-component='${snap.document.id}'`),
    )?.contents;
    if (!source) return { error: `No generated component was found for "${snap.document.id}".` };
    return { source };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not generate React preview.' };
  }
}

function ElementBindings({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  const bindings = node.bindings ?? [];
  const eventBindings = node.eventBindings ?? [];
  return (
    <div className="schema-bindings">
      <h3>Bindings</h3>
      <BindingsEditorControl
        bindings={bindings}
        fields={snap.document.fields}
        onChangeBindings={(next) => writeBindings(session, node, next)}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
      <h3>Event bindings</h3>
      <EventBindingsEditorControl
        bindings={eventBindings}
        events={snap.document.events ?? []}
        onChangeBindings={(next) => writeEventBindings(session, node, next)}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
    </div>
  );
}

function writeBindings(
  session: EditorSession,
  node: Exclude<FlatNode, { type: 'instance' }>,
  bindings: Binding[],
) {
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'bindings',
    value: bindings.length ? bindings : null,
  });
}

function writeEventBindings(
  session: EditorSession,
  node: Exclude<FlatNode, { type: 'instance' }>,
  bindings: EventBinding[],
) {
  session.execute({
    type: 'setProp',
    nodeId: node.id,
    prop: 'eventBindings',
    value: bindings.length ? bindings : null,
  });
}

function nodeLabel(node: Exclude<FlatNode, { type: 'instance' }>): string {
  return node.name?.trim() || `${node.type} · ${node.id}`;
}
