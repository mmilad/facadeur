import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { InstanceFieldOverride } from '../../../controls/instance/InstanceFieldOverride.js';
import { fieldDisplayLabel } from '../../../controls/data/field-label.js';
import './instance-context.css';
export function NestedFieldsPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const selection = snap.nestedSelection;
  if (!selection) return null;
  const context = selection.fieldContext;
  const node = selection.node;
  const title =
    node.type === 'instance' ? (context?.target.name ?? node.component) : (node.name ?? node.id);
  return (
    <div className="properties nested-fields-panel" data-testid="nested-fields-panel">
      <div className="inspector-context instance-context" data-testid="inspector-context">
        <div className="instance-context-head">
          <span className="inspector-context-kicker">Nested instance fields</span>
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
        <span className="inspector-context-meta">
          Only field values can be changed here. Shared structure and styles belong to the master.
        </span>
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
      {context?.fields.length ? (
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
      ) : (
        <p className="inspector-empty">
          This layer has no editable fields. Select a nested instance or a layer bound to a field.
        </p>
      )}
    </div>
  );
}
