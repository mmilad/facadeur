import { useEffect, useState } from 'react';
import { documentClassNames, toNested, type DocumentFile } from '@facadeur/core';
import { Field } from '../../../form/index.js';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';

const STYLE_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function StyleNameEditor({
  session,
  snap,
  nodeId,
  className,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
  className: string;
}) {
  const node = snap.activeDocument.nodes[nodeId] ?? snap.document.nodes[nodeId];
  const explicitName = node?.styleName ?? '';
  const [draft, setDraft] = useState(explicitName);
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(explicitName);
    setError('');
  }, [explicitName, nodeId]);

  function commit() {
    if (snap.activeVariantName) {
      setError('Switch to Base to rename classes.');
      return;
    }
    const name = draft.trim();
    if (name && !STYLE_NAME.test(name)) {
      setError('Use a CSS class name beginning with a letter or underscore.');
      return;
    }
    if (name === explicitName) {
      setError('');
      return;
    }
    if (name) {
      try {
        assertUniqueClassName(snap.document, nodeId, name);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'That class name is already in use.');
        return;
      }
    }
    session.execute({ type: 'setProp', nodeId, prop: 'styleName', value: name || null });
    setError('');
  }

  return (
    <div className="style-name-editor" data-testid="style-name-editor">
      <Field label="CSS class">
        <input
          className="eu-control"
          name={`style-name-${nodeId}`}
          aria-label={`CSS class for ${node?.name ?? nodeId}`}
          value={draft}
          disabled={Boolean(snap.activeVariantName)}
          placeholder={className}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setError('');
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
      </Field>
      {snap.activeVariantName ? <p className="meta">Switch to Base to rename classes.</p> : null}
      {error ? (
        <p className="style-rule-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function assertUniqueClassName(document: EditorSnapshot['document'], nodeId: string, name: string) {
  const nested = toNested(document);
  const update = (node: DocumentFile['root']): boolean => {
    if (node.id === nodeId) {
      node.styleName = name;
      return true;
    }
    if (node.type !== 'frame') return false;
    return (node.children ?? []).some(update);
  };
  if (!update(nested.root)) return;
  documentClassNames(nested);
}
