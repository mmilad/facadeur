import type { FlatDocument, FlatNode } from '@facadeur/core';
import { resolveInstanceVariantContext } from '../../../../domain/instance-variant-context.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import { variantLabel } from '../../../../domain/edits/variant-edit.js';
import './instance-context.css';

export function InstanceContext({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Extract<FlatNode, { type: 'instance' }>;
}) {
  const target = snap.componentTarget;
  const resolved = target
    ? resolveInstanceVariantContext({
        ownerDocument: snap.document,
        ownerVariantName: snap.activeVariantName,
        instance: node,
        targetDocument: target,
      })
    : null;
  const targetName = target?.name ?? node.component;
  const ownerVariant = snap.activeVariantName
    ? variantLabel(snap.document, snap.activeVariantName)
    : variantLabel(snap.document, 'default');

  return (
    <div className="inspector-context instance-context" data-testid="inspector-context">
      <div className="instance-context-head">
        <span className="inspector-context-kicker">Instance override</span>
        <span className="instance-context-badge">
          {target ? `${documentKindLabel(target.kind)} instance` : 'Instance'}
        </span>
      </div>
      <strong className="inspector-context-title">{targetName}</strong>
      <span className="inspector-context-meta">
        Owner · {snap.document.name} · {ownerVariant}
      </span>
      {resolved ? (
        <span
          className="instance-context-resolution"
          data-source={resolved.source}
          data-variant={resolved.variantName}
        >
          Nested variant · {variantLabel(target!, resolved.variantName)} ·{' '}
          {sourceLabel(resolved.source)}
        </span>
      ) : (
        <span className="instance-context-resolution">Nested variant · Unknown</span>
      )}
      {resolved && Object.keys(resolved.axes).length ? (
        <span className="instance-context-resolution">
          {Object.entries(resolved.axes)
            .map(([axis, value]) => `${axis}: ${value}`)
            .join(' · ')}
        </span>
      ) : null}
      <span className="inspector-context-meta">
        Local fields, layout, and appearance affect this instance · edit master for shared changes
      </span>
      <button
        type="button"
        className="text-button instance-context-master-button"
        name="open-component"
        onClick={() => session.openAsset(node.component, 'root')}
      >
        Edit master · {targetName}
      </button>
    </div>
  );
}

function sourceLabel(source: 'preset' | 'rule' | 'fixed' | 'default'): string {
  switch (source) {
    case 'preset':
      return 'Containing variant';
    case 'rule':
      return 'Rule';
    case 'fixed':
      return 'Fixed';
    default:
      return 'Default';
  }
}

function documentKindLabel(kind: FlatDocument['kind']): string {
  switch (kind) {
    case 'component':
      return 'Component';
    case 'atom':
      return 'Atom';
    case 'page':
      return 'Page';
    case 'section':
      return 'Section';
    default:
      return kind;
  }
}
