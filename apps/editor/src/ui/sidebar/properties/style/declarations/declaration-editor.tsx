import { useMemo } from 'react';
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
  shownDeclarations,
  writeStyleDeclaration,
  type StyleEditTarget,
} from '../../../../../domain/style-edit.js';
import { editorBreakpoints, viewportEditContext } from '../../../../../domain/viewport-edit.js';
import { CssDeclarationsControl } from '../../../../controls/generic/index.js';
import { projectFontRefs, type TypographyCatalogs } from '../../../../controls/typography/index.js';
import { OverrideCue } from '../../ViewportEditBar.js';

export function DeclarationEditor({
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
