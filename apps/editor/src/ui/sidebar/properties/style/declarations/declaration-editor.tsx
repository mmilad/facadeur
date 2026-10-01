import { useMemo, type ReactNode } from 'react';
import { findParent, type FlatNode, type StyleBlock } from '@facadeur/core';
import { layoutCapabilities } from '../../../../../domain/layout-capabilities.js';
import {
  colorTokenRefsForDocument,
  dimensionTokenRefsForDocument,
  fontFamilyTokenRefsForDocument,
  fontWeightTokenRefsForDocument,
  numberTokenRefsForDocument,
  radiusTokenRefsForDocument,
  shadowTokenRefsForDocument,
  typographyTokenRefsForDocument,
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
} from '../../../../../domain/edits/style-edit.js';
import { editorBreakpoints, viewportEditContext } from '../../../../../domain/viewport/viewport-edit.js';
import { CssDeclarationsControl } from '../../../../controls/generic/index.js';
import type { StructuredDeclarationGroup } from '../../../../controls/generic/CssDeclarationsControl.js';
import { projectFontRefs, type TypographyCatalogs } from '../../../../controls/typography/index.js';
import { OverrideCue } from '../../ViewportEditBar.js';

export function DeclarationEditor({
  session,
  snap,
  target,
  renderStructuredSection,
  inheritedDeclarations,
  instanceRoot,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  target: StyleEditTarget;
  renderStructuredSection?: (group: StructuredDeclarationGroup, content: ReactNode) => ReactNode;
  /** Effective referenced master root styles; writes still belong to this document. */
  inheritedDeclarations?: Record<string, string>;
  instanceRoot?: FlatNode;
}) {
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const namedVariant = Boolean(target.variantName);
  const instance = snap.activeDocument.nodes[target.nodeId]?.type === 'instance';
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
  const baseEntries = mergeStyleValues(
    inheritedDeclarations ?? {},
    namedVariant ? effectiveEntries : canonicalEntries,
  );
  const styleDeclarations: Record<string, Record<string, string>> = {
    [target.nodeId]: baseEntries,
  };
  const parent = findParent(snap.activeDocument, target.nodeId);
  if (parent) {
    const block = structuredClone(snap.activeDocument.styles ?? {});
    const owner =
      parent.id === snap.activeDocument.rootId
        ? block
        : ((block.children ??= {})[parent.id] ??= {});
    owner.declarations = { ...owner.declarations, ...parent.style };
    styleDeclarations[parent.id] = effectiveStyleDeclarations(
      block,
      snap.activeDocument.rootId,
      {
        nodeId: parent.id,
        ...(displayBreakpointId ? { breakpointId: displayBreakpointId } : {}),
      },
      ctx.breakpoints,
    );
  }
  const capabilities = layoutCapabilities({
    document: snap.activeDocument,
    nodeId: target.nodeId,
    instanceRoot,
    breakpointId: displayBreakpointId,
    variantName: snap.activeVariantName,
    breakpoints: ctx.breakpoints,
    styleDeclarations,
  });
  const ownEntries = namedVariant
    ? (instance ? readOwnInstanceDeclarations : readStyleDeclarations)(
        variantBlock,
        snap.document.rootId,
        {
          ...baseTarget,
        },
      )
    : {};
  const overrideEntries = namedVariant
    ? ownEntries
    : instance && !writingBreakpointId
      ? readOwnInstanceDeclarations(snap.document.styles, snap.document.rootId, target)
      : cueViewport
        ? (instance ? readOwnInstanceDeclarations : readStyleDeclarations)(
            snap.document.styles,
            snap.document.rootId,
            {
              ...target,
              breakpointId: cueViewport.id,
            },
          )
        : {};
  const listed = shownDeclarations(
    baseEntries,
    overrideEntries,
    instance || namedVariant || displayBreakpointId !== undefined,
    !namedVariant,
  );
  const writeTarget: StyleEditTarget = writingBreakpointId
    ? { ...target, breakpointId: writingBreakpointId }
    : target;

  const catalogs = useMemo(() => {
    const doc = snap.document;
    const typographyCatalogs: TypographyCatalogs = {
      fontRefs: projectFontRefs(snap.design.fonts),
      fontFamilyTokens: fontFamilyTokenRefsForDocument(snap.design.tokens, doc),
      fontWeightTokens: fontWeightTokenRefsForDocument(snap.design.tokens, doc),
      dimensionTokens: dimensionTokenRefsForDocument(snap.design.tokens, doc),
      numberTokens: numberTokenRefsForDocument(snap.design.tokens, doc),
    };
    const radiusTokens = radiusTokenRefsForDocument(snap.design.tokens, doc);
    return {
      colorTokens: colorTokenRefsForDocument(snap.design.tokens, doc),
      shadowTokens: shadowTokenRefsForDocument(snap.design.tokens, doc),
      typographyTokens: typographyTokenRefsForDocument(snap.design.tokens, doc),
      dimensionTokens: dimensionTokenRefsForDocument(snap.design.tokens, doc),
      radiusTokens: radiusTokens.length
        ? radiusTokens
        : dimensionTokenRefsForDocument(snap.design.tokens, doc),
      typographyCatalogs,
    };
  }, [snap.design.fonts, snap.design.tokens, snap.document]);

  return (
    <CssDeclarationsControl
      layoutCapabilities={capabilities}
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
        if (instance && !namedVariant && !writingBreakpointId) {
          return (
            <p className="override-cue">
              <span>Instance override</span>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  commitDeclaration(session, session.getSnapshot(), target, property, null)
                }
              >
                Reset
              </button>
            </p>
          );
        }
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

function mergeStyleValues(
  base: Record<string, string>,
  own: Record<string, string>,
): Record<string, string> {
  const result = { ...base };
  for (const [key, value] of Object.entries(own)) {
    for (const existing of Object.keys(result)) {
      if (canonicalStyleProperty(existing) === canonicalStyleProperty(key)) delete result[existing];
    }
    result[key] = value;
  }
  return result;
}

function readOwnInstanceDeclarations(
  block: StyleBlock | undefined,
  rootId: string,
  target: StyleEditTarget,
): Record<string, string> {
  const owner = target.nodeId === rootId ? block : block?.children?.[target.nodeId];
  const layer = target.breakpointId ? owner?.breakpoints?.[target.breakpointId] : owner;
  return target.state ? { ...layer?.states?.[target.state] } : { ...layer?.declarations };
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
