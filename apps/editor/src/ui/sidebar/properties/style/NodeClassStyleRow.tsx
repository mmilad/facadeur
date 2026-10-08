import { useEffect, useState } from 'react';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import { variantStyleBlock, writeStyleDeclarations } from '../../../../domain/edits/style-edit';
import {
  editorBreakpoints,
  type ViewportEditContext,
} from '../../../../domain/viewport/viewport-edit';
import {
  formatCssDeclarations,
  parseCssDeclarations,
} from '../../../../domain/style-rules/css-declarations';
import {
  readNodeStyleDraft,
  readNodeStyleFallback,
  readOwnNodeStyleLayer,
} from '../../../../domain/style-rules/node-style-draft';
import { commitStyleFields } from '../style-field';

export function NodeClassStyleRow({
  session,
  snap,
  nodeId,
  className,
  selected,
  state,
  viewport,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
  className: string;
  selected: boolean;
  state: '' | 'hover' | 'focus-visible' | 'disabled';
  viewport: ViewportEditContext;
}) {
  const target = {
    nodeId,
    ...(state ? { state } : {}),
    ...(viewport.writingBreakpointId ? { breakpointId: viewport.writingBreakpointId } : {}),
  };
  const breakpoints = editorBreakpoints(snap.document, snap.design);
  const values = readNodeStyleDraft(snap.activeDocument, nodeId, target, breakpoints);
  const sourceText = formatCssDeclarations(values);
  const [draft, setDraft] = useState(sourceText);
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(sourceText);
    setError('');
  }, [sourceText, nodeId]);

  function commit(value: string) {
    const parsed = parseCssDeclarations(value);
    if (!parsed.ok) {
      setError(`${parsed.error.message} (at character ${parsed.error.offset + 1})`);
      return;
    }

    if (!state && !viewport.writingBreakpointId) {
      const fallback = snap.activeVariantName
        ? readNodeStyleDraft(snap.document, nodeId, { nodeId }, breakpoints)
        : {};
      const patch: Record<string, string | null> = {};
      const properties = new Set([
        ...Object.keys(values),
        ...Object.keys(parsed.declarations),
        ...Object.keys(fallback),
      ]);
      for (const property of properties) {
        const next = parsed.declarations[property];
        patch[property] = snap.activeVariantName
          ? next === fallback[property]
            ? null
            : (next ?? null)
          : (next ?? null);
      }
      commitStyleFields(session, snap, nodeId, null, patch);
      setError('');
      return;
    }

    const style = snap.activeVariantName
      ? variantStyleBlock(snap.document, snap.activeVariantName)
      : snap.document.styles;
    const fallback = readNodeStyleFallback(snap.activeDocument, nodeId, target, breakpoints);
    const own = readOwnNodeStyleLayer(style, snap.document.rootId, nodeId, target);
    const patch: Record<string, string | null> = {};
    for (const property of Object.keys(own)) patch[property] = null;
    for (const [property, next] of Object.entries(parsed.declarations)) {
      patch[property] = next === fallback[property] ? null : next;
    }
    const updated = writeStyleDeclarations(style, snap.document.rootId, target, patch);
    if (snap.activeVariantName) {
      session.execute({
        type: 'setVariantStyleBlock',
        name: snap.activeVariantName,
        style: updated,
      });
    } else {
      session.execute({ type: 'setStyleBlock', style: updated });
    }
    setError('');
  }

  return (
    <details className={selected ? 'styles-source-row is-selected' : 'styles-source-row'}>
      <summary>
        <code>.{className}</code>
        <span className="styles-source-kind">{nodeId}</span>
      </summary>
      <label className="styles-css-editor">
        <span>CSS declarations</span>
        <textarea
          aria-label={`CSS ${nodeId}`}
          name={`css-${nodeId}`}
          rows={Math.max(3, Math.min(12, Object.keys(values).length + 1))}
          value={draft}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setError('');
          }}
          onBlur={(event) => commit(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            commit(event.currentTarget.value);
          }}
        />
      </label>
      {error ? (
        <p className="style-rule-error" role="alert">
          {error}
        </p>
      ) : null}
    </details>
  );
}
