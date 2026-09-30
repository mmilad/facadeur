import { useMemo, type ReactNode } from 'react';
import {
  colorTokenRefs,
  dimensionTokenRefs,
  fontFamilyTokenRefs,
  fontWeightTokenRefs,
  numberTokenRefs,
  radiusTokenRefs,
  shadowTokenRefs,
  typographyTokenRefs,
} from '../../../../../domain/editing.js';
import type { EditorSession, EditorSnapshot } from '../../../../../domain/session.js';
import {
  readStyleDeclarations,
  effectiveStyleDeclarations,
  canonicalStyleProperty,
  shownDeclarations,
  variantStyleBlock,
  writeStyleDeclarations,
  writeStyleDeclaration,
  type StyleEditTarget,
} from '../../../../../domain/style-edit.js';
import { editorBreakpoints, viewportEditContext } from '../../../../../domain/viewport-edit.js';
import { CssDeclarationsControl } from '../../../../controls/generic/index.js';
import type { StructuredDeclarationGroup } from '../../../../controls/generic/CssDeclarationsControl.js';
import { projectFontRefs, type TypographyCatalogs } from '../../../../controls/typography/index.js';
import { OverrideCue } from '../../ViewportEditBar.js';

export function DeclarationEditor({
  session,
  snap,
  target,
  renderStructuredSection,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  target: StyleEditTarget;
  renderStructuredSection?: (group: StructuredDeclarationGroup, content: ReactNode) => ReactNode;
}) {
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const namedVariant = Boolean(target.variantName);
  // Named preset styles have the same breakpoint layers as the base style
  // block. Axis layers are the legacy variant form and intentionally stay
  // base-only because their schema has no breakpoint nesting.
  const layered = !target.axis;
  const writingBreakpointId = layered ? ctx.writingBreakpointId : null;
  const cueViewport = layered ? ctx.overrideViewport : null;
  const variantBlock = target.variantName
    ? variantStyleBlock(snap.document, target.variantName)
    : undefined;
  // Base editing always shows the canonical/effective Base layer. A focused
  // wider frame only changes the visible layer when it is the write target.
  const displayBreakpointId = writingBreakpointId ?? undefined;
  const baseTarget: StyleEditTarget = {
    nodeId: target.nodeId,
    state: target.state,
    ...(displayBreakpointId ? { breakpointId: displayBreakpointId } : {}),
  };
  const effectiveTarget = target.axis ? target : { ...target, ...baseTarget };
  // The canonical document is the provenance source for base edits. The
  // active document is the effective value source when a named preset is
  // selected, since it includes inherited base and breakpoint values.
  const canonicalEntries = effectiveStyleDeclarations(
    snap.document.styles,
    snap.document.rootId,
    effectiveTarget,
    ctx.breakpoints,
  );
  const effectiveEntries = namedVariant
    ? effectiveStyleDeclarations(
        snap.activeDocument.styles,
        snap.activeDocument.rootId,
        baseTarget,
        ctx.breakpoints,
      )
    : canonicalEntries;
  const baseEntries = namedVariant ? effectiveEntries : canonicalEntries;
  const ownEntries = namedVariant
    ? readStyleDeclarations(variantBlock, snap.document.rootId, {
        ...baseTarget,
      })
    : {};
  const overrideEntries = namedVariant
    ? ownEntries
    : cueViewport
      ? readStyleDeclarations(snap.document.styles, snap.document.rootId, {
          ...target,
          breakpointId: cueViewport.id,
        })
      : {};
  const listed = shownDeclarations(
    baseEntries,
    overrideEntries,
    namedVariant || displayBreakpointId !== undefined,
    !namedVariant,
  );
  const writeTarget: StyleEditTarget = writingBreakpointId
    ? { ...target, breakpointId: writingBreakpointId }
    : target;

  const catalogs = useMemo(() => {
    const typographyCatalogs: TypographyCatalogs = {
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefs(snap.design.tokens),
      fontWeightTokens: fontWeightTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      numberTokens: numberTokenRefs(snap.design.tokens),
    };
    const radiusTokens = radiusTokenRefs(snap.design.tokens);
    return {
      colorTokens: colorTokenRefs(snap.design.tokens),
      shadowTokens: shadowTokenRefs(snap.design.tokens),
      typographyTokens: typographyTokenRefs(snap.design.tokens),
      dimensionTokens: dimensionTokenRefs(snap.design.tokens),
      radiusTokens: radiusTokens.length ? radiusTokens : dimensionTokenRefs(snap.design.tokens),
      typographyCatalogs,
    };
  }, [snap.design.fonts, snap.design.tokens]);

  return (
    <CssDeclarationsControl
      catalogs={catalogs}
      entries={listed.map((item) => ({
        ...item,
        placeholder:
          !namedVariant && item.overridden && writingBreakpointId === null
            ? Object.entries(overrideEntries).find(
                ([property]) =>
                  canonicalStyleProperty(property) === canonicalStyleProperty(item.property),
              )?.[1]
            : undefined,
      }))}
      variantViewportNote={Boolean(target.axis && snap.editTarget === 'viewport')}
      declarationName={(property) => declarationName(target, property)}
      onCommitDeclaration={(property, next, overridden) => {
        const trimmed = next.trim();
        if (namedVariant) {
          commitDeclaration(
            session,
            session.getSnapshot(),
            { ...target, ...(writingBreakpointId ? { breakpointId: writingBreakpointId } : {}) },
            property,
            trimmed ? trimmed : null,
          );
          return;
        }
        if (writingBreakpointId) {
          if (!trimmed) {
            if (overridden) {
              commitDeclaration(session, session.getSnapshot(), writeTarget, property, null);
            }
            return;
          }
          commitDeclaration(session, session.getSnapshot(), writeTarget, property, trimmed);
          return;
        }
        commitDeclaration(
          session,
          session.getSnapshot(),
          target,
          property,
          trimmed ? trimmed : null,
        );
      }}
      onPatchDeclarations={(patch) => {
        const latest = session.getSnapshot();
        commitDeclarations(
          session,
          latest,
          {
            ...target,
            ...(writingBreakpointId ? { breakpointId: writingBreakpointId } : {}),
          },
          patch,
        );
      }}
      onAddDeclaration={(property, value) => {
        commitDeclaration(session, session.getSnapshot(), writeTarget, property, value);
      }}
      renderStructuredSection={renderStructuredSection}
      emptyMessage={emptyMessage(target)}
      renderAfterRow={(property, overridden) => {
        if (!overridden) return null;
        if (namedVariant && !writingBreakpointId) {
          return (
            <VariantResetCue
              onReset={() =>
                commitDeclaration(session, session.getSnapshot(), target, property, null)
              }
            />
          );
        }
        if (!cueViewport) return null;
        const resetTarget = { ...target, breakpointId: cueViewport.id };
        return (
          <OverrideCue
            minWidth={cueViewport.minWidth}
            onReset={() =>
              commitDeclaration(session, session.getSnapshot(), resetTarget, property, null)
            }
          />
        );
      }}
    />
  );
}

function emptyMessage(target: StyleEditTarget): string {
  if ((target.axis || target.variantName) && target.state) {
    return 'No overrides for this state. It inherits the variant styles.';
  }
  if (target.axis || target.variantName) {
    return 'No overrides for this variant. It inherits the base styles.';
  }
  if (target.state) {
    return 'No overrides for this state. It inherits the base styles.';
  }
  return 'No declarations.';
}

function commitDeclaration(
  session: EditorSession,
  snap: EditorSnapshot,
  target: StyleEditTarget,
  property: string,
  value: string | null,
) {
  if (target.variantName) {
    const current = variantStyleBlock(snap.document, target.variantName);
    const style = writeStyleDeclaration(
      current,
      snap.document.rootId,
      {
        nodeId: target.nodeId,
        state: target.state,
        ...(target.breakpointId ? { breakpointId: target.breakpointId } : {}),
      },
      property,
      value,
    );
    session.execute({ type: 'setVariantStyleBlock', name: target.variantName, style });
    return;
  }
  const style = writeStyleDeclaration(
    snap.document.styles,
    snap.document.rootId,
    target,
    property,
    value,
  );
  session.execute({ type: 'setStyleBlock', style });
}

function commitDeclarations(
  session: EditorSession,
  snap: EditorSnapshot,
  target: StyleEditTarget,
  patch: Record<string, string | null>,
) {
  if (target.variantName) {
    const current = variantStyleBlock(snap.document, target.variantName);
    const style = writeStyleDeclarations(
      current,
      snap.document.rootId,
      {
        nodeId: target.nodeId,
        state: target.state,
        ...(target.breakpointId ? { breakpointId: target.breakpointId } : {}),
      },
      patch,
    );
    session.execute({ type: 'setVariantStyleBlock', name: target.variantName, style });
    return;
  }
  const style = writeStyleDeclarations(snap.document.styles, snap.document.rootId, target, patch);
  session.execute({ type: 'setStyleBlock', style });
}

function VariantResetCue({ onReset }: { onReset: () => void }) {
  return (
    <p className="override-cue">
      <span>Variant override</span>
      <button type="button" className="text-button" onClick={onReset}>
        Reset
      </button>
    </p>
  );
}

function declarationName(target: StyleEditTarget, property: string): string {
  const state = target.state ?? 'base';
  const axis = target.variantName
    ? `variant-${target.variantName}`
    : target.axis
      ? `${target.axis}-${target.value}`
      : 'base';
  return `style-${target.nodeId}-${axis}-${state}-${property}`;
}
