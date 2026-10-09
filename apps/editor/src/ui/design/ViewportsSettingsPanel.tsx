import { breakpointLabel, createCatalogUuid, type Breakpoint } from '@facadeur/core';
import { activeBreakpoints, configuredBreakpoints, isBreakpointEnabled } from '@facadeur/tokens';
import type { EditorSession, EditorSnapshot } from '../../domain/session';
import { TextControl } from '../controls/fields/index';
import { IconButton } from '../form/components/shared/IconButton';

export function ViewportsSettingsPanel({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const breakpoints = configuredBreakpoints(snap.design.settings.breakpoints);
  const active = activeBreakpoints(snap.design.settings.breakpoints);
  const commit = (next: Breakpoint[]) => commitDesignBreakpoints(session, snap, next);
  return (
    <div className="stack design-domain-panel viewport-settings">
      <p className="side-note">
        The label is the name on tabs and the canvas. Each viewport keeps a stable UUID so its token
        and style overrides remain attached when the label changes. The narrowest active viewport
        is the base layer and does not use a media query. Each wider active viewport adds a min-width
        query. Use the eye control to hide a viewport without deleting its overrides.
      </p>
      <div className="viewport-settings-list">
        {breakpoints.map((breakpoint) => {
          const enabled = isBreakpointEnabled(breakpoint);
          const isBase = enabled && active[0]?.uuid === breakpoint.uuid;
          const activeCount = breakpoints.filter(isBreakpointEnabled).length;
          return (
            <div
              key={breakpoint.uuid}
              className={
                enabled ? 'viewport-settings-row' : 'viewport-settings-row is-viewport-inactive'
              }
            >
              <TextControl
                label="Label"
                name={`settings-breakpoint-label-${breakpoint.uuid}`}
                value={breakpoint.label}
                onCommit={(value) =>
                  renameBreakpointLabel(session, snap, breakpoints, breakpoint.uuid, value)
                }
              />
              <label className="field">
                <span>Min width (px)</span>
                <input
                  name={`settings-breakpoint-width-${breakpoint.uuid}`}
                  type="number"
                  min={1}
                  step={1}
                  value={breakpoint.minWidth}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isInteger(next) || next < 1) return;
                    commit(
                      breakpoints.map((item) =>
                        item.uuid === breakpoint.uuid ? { ...item, minWidth: next } : item,
                      ),
                    );
                  }}
                />
              </label>
              <div className="viewport-settings-meta">
                <span className="meta">
                  {!enabled
                    ? 'Hidden in editor'
                    : isBase
                      ? 'Base · no media query'
                      : `@media (min-width: ${breakpoint.minWidth}px)`}
                </span>
                <div className="viewport-settings-actions">
                  <IconButton
                    className={enabled ? 'viewport-toggle-active' : 'viewport-toggle-inactive'}
                    label={
                      enabled
                        ? `Hide viewport ${breakpointLabel(breakpoint)}`
                        : `Show viewport ${breakpointLabel(breakpoint)}`
                    }
                    name={`toggle-viewport-${breakpoint.uuid}`}
                    aria-pressed={enabled}
                    disabled={enabled && activeCount <= 1}
                    title={
                      enabled && activeCount <= 1
                        ? 'At least one viewport must stay active.'
                        : undefined
                    }
                    onClick={() =>
                      toggleBreakpointEnabled(session, snap, breakpoints, breakpoint.uuid)
                    }
                  >
                    {enabled ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </IconButton>
                  {breakpoints.length > 1 ? (
                    <IconButton
                      className="token-action-remove"
                      label={`Remove viewport ${breakpointLabel(breakpoint)}`}
                      name={`remove-viewport-${breakpoint.uuid}`}
                      onClick={() =>
                        commit(breakpoints.filter((item) => item.uuid !== breakpoint.uuid))
                      }
                    >
                      <TrashIcon />
                    </IconButton>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="text-button"
        onClick={() => addViewport(session, snap, breakpoints)}
      >
        Add viewport
      </button>
    </div>
  );
}

function EyeOpenIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M1.5 8s2.2-4 6.5-4 6.5 4 6.5 4-2.2 4-6.5 4S1.5 8 1.5 8Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2 2 14 14M6.2 6.8A2 2 0 0 0 8 10a2 2 0 0 0 1.8-1.2M4.1 4.7C2.8 5.6 1.8 7 1.5 8c0 0 2.2 4 6.5 4 1.1 0 2.1-.2 3-.6M11.2 11.5c1.1-.8 1.9-1.8 2.3-2.5 0 0-2.2-4-6.5-4-.6 0-1.2.1-1.7.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M3 5h10m-8 0v8h6V5m-5-2h4l1 2H5l1-2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function commitDesignBreakpoints(session: EditorSession, snap: EditorSnapshot, next: Breakpoint[]) {
  const sorted = configuredBreakpoints(next);
  session.executeDesign({ type: 'setBreakpoints', breakpoints: sorted });
  const active = activeBreakpoints(sorted);
  const focus = snap.focusViewportId;
  if (focus && !active.some((item) => item.uuid === focus)) {
    session.setFocusViewport(active[0]?.uuid ?? null);
    session.setEditTarget('base');
  }
  const selected = snap.selectedViewportId;
  if (selected && !active.some((item) => item.uuid === selected)) {
    session.selectViewport(active[0]?.uuid ?? null);
  }
}

function toggleBreakpointEnabled(
  session: EditorSession,
  snap: EditorSnapshot,
  current: readonly Breakpoint[],
  id: string,
) {
  const target = current.find((item) => item.uuid === id);
  if (!target) return;
  const enabled = isBreakpointEnabled(target);
  if (enabled && current.filter(isBreakpointEnabled).length <= 1) {
    session.setNotice('At least one viewport must stay active.', 'error');
    return;
  }
  const next = current.map((item) => {
    if (item.uuid !== id) return item;
    if (enabled) return { ...item, enabled: false as const };
    const { enabled: _enabled, ...rest } = item;
    return rest;
  });
  commitDesignBreakpoints(session, snap, next);
}

function renameBreakpointLabel(
  session: EditorSession,
  snap: EditorSnapshot,
  current: readonly Breakpoint[],
  id: string,
  rawLabel: string,
) {
  const label = rawLabel.trim();
  const currentLabel = current.find((item) => item.uuid === id);
  if (!currentLabel || label === currentLabel.label) return;
  if (!label) {
    session.setNotice('Viewport label is required.', 'error');
    return;
  }
  if (current.some((item) => item.uuid !== id && item.label.trim() === label)) {
    session.setNotice(`Viewport label "${label}" is already in use.`, 'error');
    return;
  }
  commitDesignBreakpoints(
    session,
    snap,
    current.map((item) => (item.uuid === id ? breakpointWithLabel(item, label) : item)),
  );
}

function breakpointWithLabel(breakpoint: Breakpoint, label: string): Breakpoint {
  return { ...breakpoint, label };
}

function addViewport(session: EditorSession, snap: EditorSnapshot, current: readonly Breakpoint[]) {
  const max = current.reduce((value, item) => Math.max(value, item.minWidth), 0);
  const uuid = createCatalogUuid();
  const label = `Viewport ${current.length + 1}`;
  commitDesignBreakpoints(session, snap, [
    ...current,
    { uuid, label, minWidth: max > 0 ? max + 320 : 1280 },
  ]);
  session.setFocusViewport(uuid);
  session.setEditTarget('viewport');
}
