import { useState } from 'react';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { nestedInstanceStyleTarget } from '../../../../domain/nested-selection/style-target.js';
import { InstanceFieldOverride } from '../../../controls/instance/InstanceFieldOverride.js';
import { fieldDisplayLabel } from '../../../controls/data/field-label.js';
import { VariantTabs } from '../VariantTabs.js';
import { NestedStyleInspector } from '../style/NestedStyleInspector.js';
import './instance-context.css';
export function NestedFieldsPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const [tab, setTab] = useState<'fields' | 'style'>('fields');
  const selection = snap.nestedSelection;
  if (!selection) return null;
  const hasStyleTarget = nestedInstanceStyleTarget(selection, snap.document.rootId) !== null;
  const context = selection.fieldContext;
  const node = selection.node;
  const title =
    node.type === 'instance' ? (context?.target.name ?? node.component) : (node.name ?? node.id);
  return (
    <div className="properties nested-fields-panel" data-testid="nested-fields-panel">
      <div className="inspector-context instance-context" data-testid="inspector-context">
        <div className="instance-context-head">
          <span className="inspector-context-kicker">
            {hasStyleTarget ? 'Nested instance' : 'Nested instance fields'}
          </span>
          <span className="instance-context-badge">
            {context ? `${context.target.kind} instance` : node.type}
          </span>
        </div>
        <strong className="inspector-context-title">{title}</strong>
        <span className="inspector-context-meta">Local to {snap.document.name}</span>
        {context && node.type !== 'instance' ? (
          <span className="inspector-context-meta">
            Fields from {context.target.name} · {node.type} layer
          </span>
        ) : null}
        <span className="inspector-context-path" title={selection.renderId}>
          {selection.renderId.split('/').join(' / ')}
        </span>
        <span className="inspector-context-meta">Structure belongs to the master.</span>
        <button
          type="button"
          className="text-button instance-context-master-button"
          onClick={() =>
            session.openAsset(
              node.type === 'instance' ? node.component : selection.document.id,
              'root',
            )
          }
        >
          Edit master ·{' '}
          {node.type === 'instance'
            ? (context?.target.name ?? node.component)
            : selection.document.name}
        </button>
      </div>
      <VariantTabs session={session} snap={snap} />
      {hasStyleTarget ? (
        <div className="tabs property-tabs" role="tablist" aria-label="Nested instance properties">
          <button
            type="button"
            role="tab"
            name="nested-property-tab-fields"
            className={tab === 'fields' ? 'tab is-active' : 'tab'}
            aria-selected={tab === 'fields'}
            onClick={() => setTab('fields')}
          >
            Fields
          </button>
          <button
            type="button"
            role="tab"
            name="nested-property-tab-style"
            className={tab === 'style' ? 'tab is-active' : 'tab'}
            aria-selected={tab === 'style'}
            onClick={() => setTab('style')}
          >
            Style
          </button>
        </div>
      ) : null}
      {hasStyleTarget && tab === 'style' ? (
        <div role="tabpanel" className="property-panel">
          <NestedStyleInspector session={session} snap={snap} />
        </div>
      ) : tab === 'fields' && context?.fields.length ? (
        <div className="stack property-panel">
          <h3>Fields</h3>
          {context.fields.map((field) => {
            const overridden = Object.prototype.hasOwnProperty.call(
              context.overrides ?? {},
              field.name,
            );
            const bound = context.boundFields.includes(field.name);
            return (
              <div className="nested-field" key={`${selection.renderId}:${field.name}`}>
                <InstanceFieldOverride
                  field={field}
                  override={context.values[field.name]}
                  boundPath={
                    bound
                      ? (context.instance.fieldBindings?.[field.name] ?? 'component data')
                      : undefined
                  }
                  preserveEmptyStrings
                  onSetField={(value) => session.setNestedField(field.name, value)}
                  onInvalid={(message) => session.setNotice(message, 'error')}
                />
                <div className="nested-field-source">
                  <span>
                    {bound ? 'From data binding' : overridden ? 'Local override' : 'Inherited'}
                  </span>
                  {overridden ? (
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`Reset ${fieldDisplayLabel(field.name)}`}
                      onClick={() => session.setNestedField(field.name, null)}
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === 'fields' ? (
        <p className="inspector-empty">
          This layer has no editable fields. Select a nested instance or a layer bound to a field.
        </p>
      ) : null}
    </div>
  );
}
