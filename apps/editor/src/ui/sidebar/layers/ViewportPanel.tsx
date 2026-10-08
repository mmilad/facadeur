import { breakpointLabel, type Breakpoint } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import { editorBreakpoints } from '../../../domain/viewport/viewport-edit';
import { resolvedViewportChrome } from '../../../domain/viewport/viewport-chrome';
import { TextControl } from '../../controls/fields/index';

export function ViewportLayersList({
  session,
  snap,
  showHeading = true,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  showHeading?: boolean;
}) {
  const breakpoints = editorBreakpoints(snap.document, snap.design);
  return (
    <div className="viewport-layers">
      {showHeading ? <h3 className="side-subhead">Viewports</h3> : null}
      <div className="viewport-layer-list">
        {breakpoints.map((breakpoint) => {
          const active = snap.selectedViewportId === breakpoint.id;
          const stored = snap.viewportChrome[breakpoint.id];
          const title = resolvedViewportChrome(breakpoint, stored, snap.document.kind).title;
          return (
            <button
              key={breakpoint.id}
              type="button"
              data-breakpoint={breakpoint.id}
              className={active ? 'layer viewport-layer is-active' : 'layer viewport-layer'}
              onClick={() => session.selectViewport(breakpoint.id)}
            >
              <span className="layer-type">viewport</span>
              <span className="layer-name">{title}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="text-button viewport-add"
        onClick={() => addViewport(session, snap)}
      >
        Add viewport
      </button>
    </div>
  );
}

export function ViewportOptionsPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const breakpoints = editorBreakpoints(snap.document, snap.design);
  const selectedId = snap.selectedViewportId;
  const breakpoint = breakpoints.find((item) => item.id === selectedId);
  if (!breakpoint) {
    return <p className="inspector-empty">Select a viewport under Layers or on the stage.</p>;
  }
  const stored = snap.viewportChrome[breakpoint.id];
  const chrome = resolvedViewportChrome(breakpoint, stored, snap.document.kind);
  const canRemove = breakpoints.length > 1;
  return (
    <div className="viewport-options stack">
      <div className="inspector-context viewport-context" data-testid="viewport-context">
        <span className="inspector-context-kicker">Viewport</span>
        <strong className="inspector-context-title">{chrome.title}</strong>
        <span className="inspector-context-meta">
          {breakpoint.id} · {breakpoint.minWidth}px · selected on stage
        </span>
      </div>
      <p className="meta">
        Preview chrome only. These settings do not change the component tree or saved layout.
      </p>
      <TextControl
        label="Title"
        name="viewport-title"
        value={stored?.title ?? ''}
        placeholder={chrome.title}
        onCommit={(value) => session.setViewportChrome(breakpoint.id, { title: value })}
      />
      <div className="field">
        <span>Content alignment</span>
        <div className="viewport-edit-row" role="group" aria-label="Content alignment">
          {(
            [
              ['start', 'Start'],
              ['center', 'Center'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={chrome.contentAlign === id ? 'text-button is-active' : 'text-button'}
              aria-pressed={chrome.contentAlign === id}
              onClick={() => session.setViewportChrome(breakpoint.id, { contentAlign: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="viewport-breakpoint-actions">
        <button
          type="button"
          className="text-button"
          disabled={!canRemove}
          title={canRemove ? undefined : 'At least one viewport is required.'}
          onClick={() => removeViewport(session, snap, breakpoint.id)}
        >
          Remove viewport
        </button>
      </div>
      <BreakpointEditor session={session} snap={snap} selectedId={breakpoint.id} />
    </div>
  );
}

function BreakpointEditor({
  session,
  snap,
  selectedId,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  selectedId: string;
}) {
  const breakpoints = editorBreakpoints(snap.document, snap.design);
  return (
    <div className="stack">
      <h3>Breakpoint list</h3>
      {breakpoints.map((breakpoint) => (
        <div key={breakpoint.id} className="viewport-breakpoint-row">
          <TextControl
            label="Label"
            name={`breakpoint-label-${breakpoint.id}`}
            value={breakpoint.label ?? breakpointLabel(breakpoint)}
            onCommit={(value) => renameBreakpointLabel(session, snap, breakpoint.id, value)}
          />
          <TextControl
            label="Id"
            name={`breakpoint-id-${breakpoint.id}`}
            value={breakpoint.id}
            onCommit={(value) => {
              const id = value.trim();
              if (!id || id === breakpoint.id) return;
              renameBreakpoint(session, snap, breakpoint.id, id);
            }}
          />
          <label className="field">
            <span>Min width (px)</span>
            <input
              name={`breakpoint-width-${breakpoint.id}`}
              type="number"
              min={1}
              step={1}
              value={breakpoint.minWidth}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next) || next <= 0) return;
                updateBreakpointWidth(session, snap, breakpoint.id, next);
              }}
            />
          </label>
          {breakpoint.id === selectedId ? <p className="meta">Selected on stage.</p> : null}
        </div>
      ))}
    </div>
  );
}

function effectiveListedBreakpoints(snap: EditorSnapshot): Breakpoint[] {
  return editorBreakpoints(snap.document, snap.design);
}

function commitBreakpoints(session: EditorSession, snap: EditorSnapshot, next: Breakpoint[]) {
  const sorted = [...next].sort((left, right) => left.minWidth - right.minWidth);
  session.execute({ type: 'setBreakpoints', breakpoints: sorted });
  if (snap.selectedViewportId && !sorted.some((item) => item.id === snap.selectedViewportId)) {
    session.selectViewport(sorted[0]?.id ?? null);
  }
}

function addViewport(session: EditorSession, snap: EditorSnapshot) {
  const current = effectiveListedBreakpoints(snap);
  const max = current.reduce((value, item) => Math.max(value, item.minWidth), 0);
  const baseId = 'viewport';
  let id = baseId;
  let index = 2;
  while (current.some((item) => item.id === id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }
  const next = [...current, { id, minWidth: max > 0 ? max + 320 : 1280 }];
  commitBreakpoints(session, snap, next);
  session.selectViewport(id);
}

function removeViewport(session: EditorSession, snap: EditorSnapshot, breakpointId: string) {
  const current = effectiveListedBreakpoints(snap);
  if (current.length <= 1) return;
  const next = current.filter((item) => item.id !== breakpointId);
  commitBreakpoints(session, snap, next);
}

function renameBreakpointLabel(
  session: EditorSession,
  snap: EditorSnapshot,
  id: string,
  rawLabel: string,
) {
  const current = effectiveListedBreakpoints(snap);
  const label = rawLabel.trim();
  const target = current.find((item) => item.id === id);
  if (!target || label === (target.label ?? breakpointLabel(target))) return;
  if (label && current.some((item) => item.id !== id && item.label?.trim() === label)) {
    session.setNotice(`Viewport label "${label}" is already in use.`, 'error');
    return;
  }
  commitBreakpoints(
    session,
    snap,
    current.map((item) => (item.id === id ? breakpointWithLabel(item, label) : item)),
  );
}

function breakpointWithLabel(breakpoint: Breakpoint, label: string): Breakpoint {
  if (!label) {
    const { label: _label, ...rest } = breakpoint;
    return rest;
  }
  return { ...breakpoint, label };
}

function renameBreakpoint(
  session: EditorSession,
  snap: EditorSnapshot,
  fromId: string,
  toId: string,
) {
  const current = effectiveListedBreakpoints(snap);
  if (current.some((item) => item.id === toId)) {
    session.setNotice(`Breakpoint id "${toId}" is already in use.`, 'error');
    return;
  }
  const next = current.map((item) => (item.id === fromId ? { ...item, id: toId } : item));
  commitBreakpoints(session, snap, next);
  if (snap.selectedViewportId === fromId) session.selectViewport(toId);
  const chrome = snap.viewportChrome[fromId];
  if (chrome) {
    session.setViewportChrome(toId, chrome);
  }
}

function updateBreakpointWidth(
  session: EditorSession,
  snap: EditorSnapshot,
  breakpointId: string,
  minWidth: number,
) {
  const current = effectiveListedBreakpoints(snap);
  const next = current.map((item) =>
    item.id === breakpointId ? { ...item, minWidth: Math.round(minWidth) } : item,
  );
  commitBreakpoints(session, snap, next);
}
