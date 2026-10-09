import { breakpointLabel, createCatalogUuid, type Breakpoint } from '@facadeur/core';
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
          const active = snap.selectedViewportId === breakpoint.uuid;
          const stored = snap.viewportChrome[breakpoint.uuid];
          const title = resolvedViewportChrome(breakpoint, stored, snap.document.kind).title;
          return (
            <button
              key={breakpoint.uuid}
              type="button"
              data-breakpoint={breakpoint.uuid}
              className={active ? 'layer viewport-layer is-active' : 'layer viewport-layer'}
              onClick={() => session.selectViewport(breakpoint.uuid)}
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
  const breakpoint = breakpoints.find((item) => item.uuid === selectedId);
  if (!breakpoint) {
    return <p className="inspector-empty">Select a viewport under Layers or on the stage.</p>;
  }
  const stored = snap.viewportChrome[breakpoint.uuid];
  const chrome = resolvedViewportChrome(breakpoint, stored, snap.document.kind);
  const canRemove = breakpoints.length > 1;
  return (
    <div className="viewport-options stack">
      <div className="inspector-context viewport-context" data-testid="viewport-context">
        <span className="inspector-context-kicker">Viewport</span>
        <strong className="inspector-context-title">{chrome.title}</strong>
        <span className="inspector-context-meta">
          {breakpoint.minWidth}px · selected on stage
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
        onCommit={(value) => session.setViewportChrome(breakpoint.uuid, { title: value })}
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
              onClick={() => session.setViewportChrome(breakpoint.uuid, { contentAlign: id })}
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
          onClick={() => removeViewport(session, snap, breakpoint.uuid)}
        >
          Remove viewport
        </button>
      </div>
      <BreakpointEditor session={session} snap={snap} selectedId={breakpoint.uuid} />
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
        <div key={breakpoint.uuid} className="viewport-breakpoint-row">
          <TextControl
            label="Label"
            name={`breakpoint-label-${breakpoint.uuid}`}
            value={breakpoint.label}
            onCommit={(value) => renameBreakpointLabel(session, snap, breakpoint.uuid, value)}
          />
          <label className="field">
            <span>Min width (px)</span>
            <input
              name={`breakpoint-width-${breakpoint.uuid}`}
              type="number"
              min={1}
              step={1}
              value={breakpoint.minWidth}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next) || next <= 0) return;
                updateBreakpointWidth(session, snap, breakpoint.uuid, next);
              }}
            />
          </label>
          {breakpoint.uuid === selectedId ? <p className="meta">Selected on stage.</p> : null}
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
  if (snap.selectedViewportId && !sorted.some((item) => item.uuid === snap.selectedViewportId)) {
    session.selectViewport(sorted[0]?.uuid ?? null);
  }
}

function addViewport(session: EditorSession, snap: EditorSnapshot) {
  const current = effectiveListedBreakpoints(snap);
  const max = current.reduce((value, item) => Math.max(value, item.minWidth), 0);
  const uuid = createCatalogUuid();
  const next = [...current, {
    uuid,
    label: `Viewport ${current.length + 1}`,
    minWidth: max > 0 ? max + 320 : 1280,
  }];
  commitBreakpoints(session, snap, next);
  session.selectViewport(uuid);
}

function removeViewport(session: EditorSession, snap: EditorSnapshot, breakpointId: string) {
  const current = effectiveListedBreakpoints(snap);
  if (current.length <= 1) return;
  const next = current.filter((item) => item.uuid !== breakpointId);
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
  const target = current.find((item) => item.uuid === id);
  if (!target || label === target.label) return;
  if (!label) {
    session.setNotice('Viewport label is required.', 'error');
    return;
  }
  if (current.some((item) => item.uuid !== id && item.label.trim() === label)) {
    session.setNotice(`Viewport label "${label}" is already in use.`, 'error');
    return;
  }
  commitBreakpoints(
    session,
    snap,
    current.map((item) => (item.uuid === id ? breakpointWithLabel(item, label) : item)),
  );
}

function breakpointWithLabel(breakpoint: Breakpoint, label: string): Breakpoint {
  return { ...breakpoint, label };
}

function updateBreakpointWidth(
  session: EditorSession,
  snap: EditorSnapshot,
  breakpointId: string,
  minWidth: number,
) {
  const current = effectiveListedBreakpoints(snap);
  const next = current.map((item) =>
    item.uuid === breakpointId ? { ...item, minWidth: Math.round(minWidth) } : item,
  );
  commitBreakpoints(session, snap, next);
}
