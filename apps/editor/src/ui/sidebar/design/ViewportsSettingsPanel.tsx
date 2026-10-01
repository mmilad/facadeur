import { breakpointLabel, type Breakpoint } from '@facadeur/core';
import { activeBreakpoints } from '@facadeur/tokens';
import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import { TextControl } from '../../controls/fields/index.js';

const BREAKPOINT_ID = /^[a-z][a-z0-9]*$/;

export function ViewportsSettingsPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const breakpoints = activeBreakpoints(snap.design.settings.breakpoints);
  const commit = (next: Breakpoint[]) => commitDesignBreakpoints(session, snap, next);
  return (
    <div className="stack design-domain-panel viewport-settings">
      <p className="side-note">
        The label is the name on tabs and the canvas. The id stays in token overrides. The
        narrowest viewport is the base layer and does not use a media query. Each wider viewport
        adds a min-width query.
      </p>
      <div className="viewport-settings-list">
        {breakpoints.map((breakpoint, index) => (
          <div key={breakpoint.id} className="viewport-settings-row">
            <TextControl
              label="Label"
              name={`settings-breakpoint-label-${breakpoint.id}`}
              value={breakpoint.label ?? breakpointLabel(breakpoint)}
              onCommit={(value) =>
                renameBreakpointLabel(session, snap, breakpoints, breakpoint.id, value)
              }
            />
            <TextControl
              label="Id"
              name={`settings-breakpoint-id-${breakpoint.id}`}
              value={breakpoint.id}
              onCommit={(value) =>
                renameBreakpoint(session, snap, breakpoints, breakpoint.id, value)
              }
            />
            <label className="field">
              <span>Min width (px)</span>
              <input
                name={`settings-breakpoint-width-${breakpoint.id}`}
                type="number"
                min={1}
                step={1}
                value={breakpoint.minWidth}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isInteger(next) || next < 1) return;
                  commit(
                    breakpoints.map((item) =>
                      item.id === breakpoint.id ? { ...item, minWidth: next } : item,
                    ),
                  );
                }}
              />
            </label>
            <div className="viewport-settings-meta">
              <span className="meta">
                {index === 0
                  ? 'Base · no media query'
                  : `@media (min-width: ${breakpoint.minWidth}px)`}
              </span>
              {breakpoints.length > 1 ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    commit(breakpoints.filter((item) => item.id !== breakpoint.id))
                  }
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="text-button" onClick={() => addViewport(session, snap, breakpoints)}>
        Add viewport
      </button>
    </div>
  );
}

function commitDesignBreakpoints(
  session: EditorSession,
  snap: EditorSnapshot,
  next: Breakpoint[],
) {
  const sorted = [...next].sort((left, right) => left.minWidth - right.minWidth);
  session.executeDesign({ type: 'setBreakpoints', breakpoints: sorted });
  const focus = snap.focusViewportId;
  if (focus && !sorted.some((item) => item.id === focus)) {
    session.setFocusViewport(sorted[0]?.id ?? null);
    session.setEditTarget('base');
  }
}

function renameBreakpointLabel(
  session: EditorSession,
  snap: EditorSnapshot,
  current: readonly Breakpoint[],
  id: string,
  rawLabel: string,
) {
  const label = rawLabel.trim();
  const currentLabel = current.find((item) => item.id === id);
  if (!currentLabel || label === (currentLabel.label ?? breakpointLabel(currentLabel))) return;
  if (label && current.some((item) => item.id !== id && item.label?.trim() === label)) {
    session.setNotice(`Viewport label "${label}" is already in use.`, 'error');
    return;
  }
  commitDesignBreakpoints(
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
  current: readonly Breakpoint[],
  fromId: string,
  rawId: string,
) {
  const toId = rawId.trim();
  if (!toId || toId === fromId) return;
  if (!BREAKPOINT_ID.test(toId)) {
    session.setNotice(`Breakpoint id "${toId}" must be lowercase letters and digits.`, 'error');
    return;
  }
  if (current.some((item) => item.id === toId)) {
    session.setNotice(`Breakpoint id "${toId}" is already in use.`, 'error');
    return;
  }
  commitDesignBreakpoints(
    session,
    snap,
    current.map((item) => (item.id === fromId ? { ...item, id: toId } : item)),
  );
  if (snap.focusViewportId === fromId) session.setFocusViewport(toId);
}

function addViewport(session: EditorSession, snap: EditorSnapshot, current: readonly Breakpoint[]) {
  const max = current.reduce((value, item) => Math.max(value, item.minWidth), 0);
  let id = 'wide';
  let index = 2;
  while (current.some((item) => item.id === id)) {
    id = `wide${index}`;
    index += 1;
  }
  commitDesignBreakpoints(session, snap, [...current, { id, minWidth: max > 0 ? max + 320 : 1280 }]);
  session.setFocusViewport(id);
  session.setEditTarget('viewport');
}
