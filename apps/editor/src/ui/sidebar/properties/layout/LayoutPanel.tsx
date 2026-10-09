import {
  type FlatNode,
  type Command,
  type LayoutOverride,
  type VariantNodeOverride,
  type VariantPreset,
} from '@facadeur/core';
import type { ReactNode } from 'react';
import { resolveSelectedInstance } from '../../../../domain/instance-variant-context';
import { TokenValueLabelProvider } from '../../../controls/fields/TokenPreviewContext';
import type { LayoutField } from '../../../../domain/layout-capabilities';
import {
  clearLayoutBreakpoint,
  dimensionTokenRefsForDocument,
  writeLayoutFields,
  type LayoutPatch,
} from '../../../../domain/editing';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import { canonicalStyleProperty } from '../../../../domain/edits/style-edit';
import {
  effectiveLayout as resolveLayout,
  layoutCapabilities,
} from '../../../../domain/layout-capabilities';
import { editorBreakpoints, viewportEditContext } from '../../../../domain/viewport/viewport-edit';
import {
  LayoutControl,
  layoutControlValue,
  type LayoutControlSection,
  type LayoutControlSectionContent,
} from '../../../controls/layout/index';
import { OverrideCue } from '../ViewportEditBar';
import { layoutStyleField } from './style-field';
import { SelfAlignment } from './SelfAlignment';
import { GridContainer } from './grid/GridContainer';
import { GridItem } from './grid/GridItem';
import { GridAreas } from './grid/GridAreas';
import { parseGridAreas, renameGridArea } from './grid/areas';
import { commitGridChanges, gridDeclarations } from './grid/edits';
import { gridInstance } from './grid/instance';
import { shownAxis, commitAxisCss } from './sizing';

export function LayoutPanel({
  session,
  snap,
  node,
  section,
  sectionContent,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: FlatNode;
  section?: LayoutControlSection;
  sectionContent?: LayoutControlSectionContent;
}) {
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const breakpointId = ctx.writingBreakpointId;
  const tokens = dimensionTokenRefsForDocument(snap.design.tokens, snap.document);
  const cueViewport = ctx.overrideViewport;
  const variantEntry = snap.activeVariantName
    ? variantNodeEntry(snap.document, snap.activeVariantName, node.id)
    : null;
  const ownLayout = variantEntry?.override.layout;
  const effectiveNode = snap.activeDocument.nodes[node.id] ?? node;
  const effectiveLayout = effectiveNode.layout ? structuredClone(effectiveNode.layout) : undefined;
  // A wider target inherits all preceding min-width layers, not just Base.
  if (effectiveLayout && breakpointId) {
    const targetWidth = ctx.breakpoints.find((item) => item.uuid === breakpointId)?.minWidth ?? 0;
    for (const breakpoint of ctx.breakpoints) {
      if (breakpoint.uuid === ctx.base?.uuid || breakpoint.minWidth > targetWidth) continue;
      Object.assign(effectiveLayout, effectiveNode.layout?.breakpoints?.[breakpoint.uuid]);
    }
  }
  const controlValue = layoutControlValue({
    nodeType: node.type,
    layout: effectiveLayout,
    writingBreakpointId: null,
  });
  const styleDeclarations: Record<string, Record<string, string>> = {};
  const selectedInstance = gridInstance(session, snap, effectiveNode.id, breakpointId);
  const masterLayout = resolveLayout(selectedInstance?.root?.layout, breakpointId, ctx.breakpoints);
  const declarationsFor = (id: string) =>
    gridDeclarations(
      snap,
      id,
      breakpointId,
      ctx.breakpoints,
      gridInstance(session, snap, id, breakpointId)?.declarations,
    );
  for (const candidate of [effectiveNode.id, ctxParentId(snap.activeDocument, effectiveNode.id)]) {
    if (!candidate) continue;
    styleDeclarations[candidate] = declarationsFor(candidate);
  }
  const capabilities = layoutCapabilities({
    document: snap.activeDocument,
    nodeId: effectiveNode.id,
    instanceRoot: selectedInstance?.root,
    breakpointId,
    variantName: snap.activeVariantName,
    breakpoints: ctx.breakpoints,
    styleDeclarations,
  });
  const display = layoutStyleField(session, snap, node.id, breakpointId, 'display');
  const selfAlignment = layoutStyleField(session, snap, node.id, breakpointId, 'align-self');
  const parent = capabilities.parentId
    ? snap.activeDocument.nodes[capabilities.parentId]
    : undefined;
  const declaration = (id: string, property: string) =>
    Object.entries(styleDeclarations[id] ?? {}).find(
      ([key]) => canonicalStyleProperty(key) === property,
    )?.[1];
  const parentDirection =
    declaration(capabilities.parentId ?? '', 'flex-direction') ??
    resolveLayout(parent?.layout, breakpointId, ctx.breakpoints).direction ??
    'column';
  const gridValues = Object.fromEntries(
    Object.entries(styleDeclarations[node.id] ?? {}).map(([key, value]) => [
      canonicalStyleProperty(key),
      value,
    ]),
  );
  const gridField = (property: string) =>
    layoutStyleField(session, snap, node.id, breakpointId, property);
  const axes = {
    width: shownAxis('width', effectiveLayout?.width ?? masterLayout.width, gridValues),
    height: shownAxis('height', effectiveLayout?.height ?? masterLayout.height, gridValues),
  };
  controlValue.width = axes.width.value;
  controlValue.height = axes.height.value;
  const ownLayer = breakpointId
    ? (variantEntry ? ownLayout : node.layout)?.breakpoints?.[breakpointId]
    : variantEntry
      ? ownLayout
      : node.layout;
  const axisModes = Object.fromEntries(
    (['width', 'height'] as const).map((axis) => [
      axis,
      ownLayer?.[axis] || gridField(axis).overridden
        ? axes[axis].customValue
          ? 'custom'
          : (axes[axis].value?.mode ?? '')
        : '',
    ]),
  ) as Partial<
    Record<'width' | 'height', NonNullable<typeof controlValue.width>['mode'] | '' | 'custom'>
  >;
  if (gridValues.gap === undefined && controlValue.gap) gridValues.gap = controlValue.gap;
  const parentAreas = parseGridAreas(
    declaration(capabilities.parentId ?? '', 'grid-template-areas') ?? '',
  );
  const gridPatch = (patch: Record<string, string | null>) =>
    commitGridChanges(session, snap, breakpointId, [{ nodeId: node.id, patch }]);
  function renameArea(oldName: string, newName: string) {
    const value = renameGridArea(gridValues['grid-template-areas'] ?? '', oldName, newName);
    const children = effectiveNode.type === 'frame' ? effectiveNode.children : [];
    const changes = [
      { nodeId: node.id, patch: { 'grid-template-areas': value } as Record<string, string | null> },
    ];
    for (const childId of children) {
      const declarations = declarationsFor(childId);
      {
        const patch: Record<string, string | null> = {};
        if (declarations['grid-area'] === oldName) patch['grid-area'] = newName;
        for (const key of [
          'grid-column-start',
          'grid-column-end',
          'grid-row-start',
          'grid-row-end',
        ]) {
          if (declarations[key] === oldName) patch[key] = newName;
        }
        if (Object.keys(patch).length) changes.push({ nodeId: childId, patch });
      }
    }
    commitGridChanges(session, snap, breakpointId, changes);
  }

  function cue(key: keyof LayoutOverride) {
    const own = breakpointId
      ? (variantEntry ? ownLayout : node.layout)?.breakpoints?.[breakpointId]
      : variantEntry
        ? ownLayout
        : undefined;
    if (own?.[key] !== undefined) {
      return (
        <p className="override-cue">
          <span>
            {snap.activeVariantName ?? 'Default'} · {breakpointId ?? 'Base'}
          </span>
          <button
            type="button"
            className="text-button"
            aria-label={`Reset layout ${key}`}
            onClick={() => commit({ [key]: null })}
          >
            Reset
          </button>
        </p>
      );
    }
    if (!cueViewport) return null;
    const override = variantEntry
      ? ownLayout?.breakpoints?.[cueViewport.uuid]
      : node.layout?.breakpoints?.[cueViewport.uuid];
    if (!override || override[key] === undefined) return null;
    return (
      <OverrideCue
        minWidth={cueViewport.minWidth}
        onReset={() => commit({ [key]: null }, cueViewport.uuid)}
      />
    );
  }

  function commit(patch: LayoutPatch, targetBreakpointId = breakpointId) {
    for (const axis of ['width', 'height'] as const) {
      if (Object.keys(patch).length !== 1 || !Object.prototype.hasOwnProperty.call(patch, axis))
        continue;
      const value = patch[axis] ?? null;
      if (value === null || value.mode === 'auto' || gridValues[axis] !== undefined) {
        const latest = session.getSnapshot();
        const entry = snap.activeVariantName
          ? variantNodeEntry(latest.document, snap.activeVariantName, node.id)
          : null;
        const source =
          entry?.override.layout ?? (!entry ? latest.document.nodes[node.id]?.layout : undefined);
        const layer = targetBreakpointId ? source?.breakpoints?.[targetBreakpointId] : source;
        const cleanup: Command | undefined =
          layer?.[axis] === undefined
            ? undefined
            : entry
              ? variantLayoutCommand(entry, targetBreakpointId, { [axis]: null })
              : {
                  type: 'setProp',
                  nodeId: node.id,
                  prop: 'layout',
                  value: writeLayoutFields(source, targetBreakpointId, { [axis]: null }),
                };
        commitAxisCss(session, snap, node.id, targetBreakpointId, axis, value, cleanup);
        return;
      }
    }
    if (variantEntry) {
      const latest = variantNodeEntry(
        session.getSnapshot().document,
        snap.activeVariantName!,
        node.id,
      );
      if (latest) {
        const normalized: LayoutPatch = { ...patch };
        if (
          (patch.x !== undefined || patch.y !== undefined) &&
          patch.position === undefined &&
          controlValue.position === 'absolute'
        ) {
          normalized.position = 'absolute';
        }
        if (targetBreakpointId === null) {
          if (patch.position === null && controlValue.position === 'absolute') {
            normalized.position = 'auto';
          }
          if (patch.wrap === null && controlValue.wrap === true) {
            normalized.wrap = false;
          }
        }
        commitVariantLayout(session, latest, targetBreakpointId, normalized);
      }
      return;
    }
    session.execute({
      type: 'setProp',
      nodeId: node.id,
      prop: 'layout',
      value: writeLayoutFields(
        session.getSnapshot().document.nodes[node.id]?.layout,
        targetBreakpointId,
        patch,
      ),
    });
  }

  const masterDocument = resolveSelectedInstance(snap)?.document;

  function layoutFieldOwn(key: keyof LayoutOverride): boolean {
    const own = breakpointId
      ? (variantEntry ? ownLayout : node.layout)?.breakpoints?.[breakpointId]
      : variantEntry
        ? ownLayout
        : node.layout;
    if (own?.[key] !== undefined) return true;
    if (key === 'width' || key === 'height') return gridField(key).overridden;
    return false;
  }

  function renderValueLabelScope(field: LayoutField, content: ReactNode): ReactNode {
    if (effectiveNode.type !== 'instance' || !masterDocument || layoutFieldOwn(field)) {
      return content;
    }
    return (
      <TokenValueLabelProvider design={snap.design} document={masterDocument}>
        {content}
      </TokenValueLabelProvider>
    );
  }

  function inactiveReset(key: keyof LayoutOverride) {
    const own = breakpointId
      ? (variantEntry ? ownLayout : node.layout)?.breakpoints?.[breakpointId]
      : variantEntry
        ? ownLayout
        : node.layout;
    if (own?.[key] === undefined) return null;
    return (
      <button
        type="button"
        className="text-button"
        aria-label={`Reset layout ${key}`}
        onClick={() => commit({ [key]: null })}
      >
        Reset
      </button>
    );
  }

  return (
    <div className="stack">
      {(!section || section === 'layout') &&
      cueViewport &&
      (variantEntry ? ownLayout : node.layout)?.breakpoints?.[cueViewport.uuid] ? (
        <button
          type="button"
          className="text-button"
          onClick={() =>
            variantEntry
              ? commitVariantLayout(session, variantEntry, cueViewport.uuid, {
                  direction: null,
                  gap: null,
                  padding: null,
                  margin: null,
                  justify: null,
                  align: null,
                  wrap: null,
                  position: null,
                  x: null,
                  y: null,
                  width: null,
                  height: null,
                })
              : session.execute({
                  type: 'setProp',
                  nodeId: node.id,
                  prop: 'layout',
                  value: clearLayoutBreakpoint(node.layout, cueViewport.uuid),
                })
          }
        >
          Reset layout {cueViewport.uuid}
        </button>
      ) : null}
      <LayoutControl
        value={controlValue}
        dimensionTokens={tokens}
        writingBreakpointId={breakpointId}
        capabilities={capabilities}
        displayMode={capabilities.selectedDisplay}
        gridEnabled
        axisModes={axisModes}
        customSizes={{ width: axes.width.customValue, height: axes.height.customValue }}
        onDisplayModeCommit={(mode) => display.commit(mode === 'flow' ? 'block' : mode)}
        displayModeReset={
          display.overridden ? (
            <button
              type="button"
              className="text-button"
              aria-label="Reset layout mode"
              onClick={() => display.commit(null)}
            >
              Reset
            </button>
          ) : undefined
        }
        onCommit={commit}
        afterField={cue}
        resetField={inactiveReset}
        renderValueLabelScope={renderValueLabelScope}
        section={section}
        sectionContent={{
          ...sectionContent,
          layout: (
            <>
              {capabilities.selectedDisplay === 'grid' ? (
                <GridContainer
                  guidedOnly
                  values={gridValues}
                  dimensionTokens={tokens}
                  onCommit={(property, value) => gridField(property).commit(value)}
                  onPatch={gridPatch}
                  overridden={(property) => gridField(property).overridden}
                />
              ) : null}
              {capabilities.selectedDisplay === 'grid' ? (
                <GridAreas
                  key={`${node.id}:${snap.activeVariantName}:${breakpointId}`}
                  value={gridValues['grid-template-areas'] ?? ''}
                  onCommit={(value) => gridField('grid-template-areas').commit(value)}
                  onRename={renameArea}
                  overridden={gridField('grid-template-areas').overridden}
                />
              ) : null}
              {sectionContent?.layout}
            </>
          ),
          size: (
            <>
              {capabilities.isDirectGridItem ||
              Object.keys(gridValues).some((key) =>
                /^grid-(area|column(?:-start|-end)?|row(?:-start|-end)?)$/.test(key),
              ) ? (
                <GridItem
                  guidedOnly
                  values={gridValues}
                  active={capabilities.isDirectGridItem}
                  areaNames={parentAreas.names}
                  areaTemplateError={parentAreas.error}
                  onCommit={(property, value) => gridField(property).commit(value)}
                  onPatch={gridPatch}
                  overridden={(property) => gridField(property).overridden}
                />
              ) : null}
              {capabilities.parentDisplay !== 'grid' ? (
                <SelfAlignment
                  value={declaration(node.id, 'align-self')}
                  horizontal={parentDirection.startsWith('row')}
                  active={capabilities.isDirectFlexItem}
                  retained={selfAlignment.overridden}
                  fill={controlValue.width?.mode === 'fill' && !parentDirection.startsWith('row')}
                  onCommit={selfAlignment.commit}
                  onReset={selfAlignment.overridden ? () => selfAlignment.commit(null) : undefined}
                />
              ) : null}
              {sectionContent?.size}
            </>
          ),
        }}
      />
    </div>
  );
}

function ctxParentId(document: EditorSnapshot['activeDocument'], nodeId: string): string | null {
  for (const candidate of Object.values(document.nodes)) {
    if (candidate.type === 'frame' && candidate.children.includes(nodeId)) return candidate.id;
  }
  return null;
}

interface VariantNodeEntry {
  preset: VariantPreset;
  key: string;
  override: VariantNodeOverride;
}

function variantNodeEntry(
  document: EditorSnapshot['document'],
  name: string,
  nodeId: string,
): VariantNodeEntry | null {
  const preset = document.variantPresets?.find((candidate) => candidate.name === name);
  const nodes = preset?.overrides?.nodes;
  if (!preset || !nodes) return preset ? { preset, key: nodeId, override: {} } : null;
  const key = Object.prototype.hasOwnProperty.call(nodes, nodeId)
    ? nodeId
    : (Object.keys(nodes).find((candidate) => candidate.endsWith(`.${nodeId}`)) ?? nodeId);
  return { preset, key, override: nodes[key] ?? {} };
}

function commitVariantLayout(
  session: EditorSession,
  entry: VariantNodeEntry,
  breakpointId: string | null,
  patch: LayoutPatch,
): void {
  session.execute(variantLayoutCommand(entry, breakpointId, patch));
}

function variantLayoutCommand(
  entry: VariantNodeEntry,
  breakpointId: string | null,
  patch: LayoutPatch,
): Command {
  const preset = structuredClone(entry.preset);
  const overrides = { ...(preset.overrides ?? {}) };
  const nodes = { ...(overrides.nodes ?? {}) };
  const nodeOverride = structuredClone(nodes[entry.key] ?? entry.override);
  const layout = writeLayoutFields(nodeOverride.layout, breakpointId, patch);
  if (layout) nodeOverride.layout = layout;
  else delete nodeOverride.layout;
  if (Object.keys(nodeOverride).length) nodes[entry.key] = nodeOverride;
  else delete nodes[entry.key];
  if (Object.keys(nodes).length) overrides.nodes = nodes;
  else delete overrides.nodes;
  if (Object.keys(overrides).length) preset.overrides = overrides;
  else delete preset.overrides;
  return { type: 'setVariantPreset', preset };
}
