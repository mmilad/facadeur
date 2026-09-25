import { type Binding, type FlatNode } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../session.js';
import {
  readStyleDeclarations,
  shownDeclarations,
  styleStateNames,
  writeStyleDeclaration,
  type StyleEditTarget,
} from '../style-edit.js';
import { editorBreakpoints, viewportEditContext } from '../viewport-edit.js';
import { BindingsEditorControl, FieldsEditorControl } from './controls/data/index.js';
import { CssDeclarationsControl } from './controls/generic/index.js';
import { VariantStyleLayers, VariantsEditorControl } from './controls/variants/index.js';
import { OverrideCue } from './viewport-bar.js';

export function ownsComponentFeatures(kind: string): boolean {
  return kind === 'atom' || kind === 'component';
}

export function ComponentFields({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return (
    <div className="stack">
      <h3>Fields</h3>
      <FieldsEditorControl
        fields={snap.document.fields}
        onDefineField={(field) => session.execute({ type: 'defineField', field })}
        onRemoveField={(name) => session.execute({ type: 'removeField', name })}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
    </div>
  );
}

export function ComponentVariants({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  return (
    <div className="stack">
      <h3>Variants</h3>
      <VariantsEditorControl
        variants={snap.document.variants}
        onDefineVariant={(axis) => session.execute({ type: 'defineVariant', axis })}
        onRemoveVariant={(name) => session.execute({ type: 'removeVariant', name })}
        onInvalid={(message) => session.setNotice(message, 'error')}
        renderAxisExtras={(axis) => (
          <VariantStyleLayers
            axis={axis}
            stateNames={styleStateNames}
            renderDeclarations={(value) => (
              <DeclarationEditor
                session={session}
                snap={snap}
                target={{ nodeId: snap.document.rootId, axis: axis.name, value }}
              />
            )}
            renderStateDeclarations={(value, state) => (
              <DeclarationEditor
                session={session}
                snap={snap}
                target={{
                  nodeId: snap.document.rootId,
                  axis: axis.name,
                  value,
                  state: state as (typeof styleStateNames)[number],
                }}
              />
            )}
          />
        )}
      />
      <p className="meta">States live on the style block, above node style overrides.</p>
      {styleStateNames.map((state) => (
        <details key={state} className="fold">
          <summary>{state}</summary>
          <DeclarationEditor
            session={session}
            snap={snap}
            target={{ nodeId: snap.document.rootId, state }}
          />
        </details>
      ))}
    </div>
  );
}

export function NodeBindings({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: Exclude<FlatNode, { type: 'instance' }>;
}) {
  if (!ownsComponentFeatures(snap.document.kind)) return null;
  const bindings = node.bindings ?? [];
  return (
    <div className="stack">
      <h3>Bindings</h3>
      <BindingsEditorControl
        bindings={bindings}
        fields={snap.document.fields}
        onChangeBindings={(next) => writeBindings(session, node, next)}
        onInvalid={(message) => session.setNotice(message, 'error')}
      />
    </div>
  );
}

export function NodeStyleBlock({
  session,
  snap,
  nodeId,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
}) {
  return (
    <div className="stack">
      <h3>Style</h3>
      <p className="meta">
        Base has no media query. A viewport override writes only that breakpoint.
      </p>
      <DeclarationEditor session={session} snap={snap} target={{ nodeId }} />
    </div>
  );
}

export function NodeVariantStyles({
  session,
  snap,
  nodeId,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  nodeId: string;
}) {
  if (!ownsComponentFeatures(snap.document.kind) || !snap.document.variants.length) return null;
  return (
    <div className="stack">
      <h3>Variant styles</h3>
      <p className="meta">These override this layer for one variant value.</p>
      {snap.document.variants.map((axis) => (
        <VariantStyleLayers
          key={axis.name}
          axis={axis}
          stateNames={styleStateNames}
          renderDeclarations={(value) => (
            <DeclarationEditor
              session={session}
              snap={snap}
              target={{ nodeId, axis: axis.name, value }}
            />
          )}
          renderStateDeclarations={(value, state) => (
            <DeclarationEditor
              session={session}
              snap={snap}
              target={{
                nodeId,
                axis: axis.name,
                value,
                state: state as (typeof styleStateNames)[number],
              }}
            />
          )}
        />
      ))}
    </div>
  );
}

function DeclarationEditor({
  session,
  snap,
  target,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  target: StyleEditTarget;
}) {
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const layered = !target.axis;
  const writingBreakpointId = layered ? ctx.writingBreakpointId : null;
  const cueViewport = layered ? ctx.overrideViewport : null;
  const baseEntries = readStyleDeclarations(snap.document.styles, snap.document.rootId, target);
  const overrideEntries = cueViewport
    ? readStyleDeclarations(snap.document.styles, snap.document.rootId, {
        ...target,
        breakpointId: cueViewport.id,
      })
    : {};
  const listed = shownDeclarations(baseEntries, overrideEntries, writingBreakpointId !== null);
  const writeTarget: StyleEditTarget = writingBreakpointId
    ? { ...target, breakpointId: writingBreakpointId }
    : target;

  return (
    <CssDeclarationsControl
      entries={listed.map((item) => ({
        ...item,
        placeholder:
          item.overridden && writingBreakpointId === null
            ? overrideEntries[item.property]
            : undefined,
      }))}
      variantViewportNote={Boolean(target.axis && snap.editTarget === 'viewport')}
      declarationName={(property) => declarationName(target, property)}
      onCommitDeclaration={(property, next, overridden) => {
        const trimmed = next.trim();
        if (writingBreakpointId) {
          if (!trimmed) {
            if (overridden) commitDeclaration(session, snap, writeTarget, property, null);
            return;
          }
          commitDeclaration(session, snap, writeTarget, property, trimmed);
          return;
        }
        commitDeclaration(session, snap, target, property, trimmed ? trimmed : null);
      }}
      onAddDeclaration={(property, value) => {
        commitDeclaration(session, snap, writeTarget, property, value);
      }}
      renderAfterRow={(property, overridden) =>
        overridden && cueViewport ? (
          <OverrideCue
            minWidth={cueViewport.minWidth}
            onReset={() =>
              commitDeclaration(
                session,
                snap,
                { ...target, breakpointId: cueViewport.id },
                property,
                null,
              )
            }
          />
        ) : null
      }
    />
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

function commitDeclaration(
  session: EditorSession,
  snap: EditorSnapshot,
  target: StyleEditTarget,
  property: string,
  value: string | null,
) {
  const style = writeStyleDeclaration(
    snap.document.styles,
    snap.document.rootId,
    target,
    property,
    value,
  );
  session.execute({ type: 'setStyleBlock', style });
}

function declarationName(target: StyleEditTarget, property: string): string {
  const state = target.state ?? 'base';
  const axis = target.axis ? `${target.axis}-${target.value}` : 'base';
  return `style-${target.nodeId}-${axis}-${state}-${property}`;
}
