import { useMemo, useState } from 'react';
import {
  createId,
  documentClassNames,
  toNested,
  type StyleBlock,
  type StyleRule,
} from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import type { StyleStateName } from '../../../../domain/edits/style-edit';
import {
  editorBreakpoints,
  viewportEditContext,
} from '../../../../domain/viewport/viewport-edit';
import { Field, Select } from '../../../form/index';
import { NodeClassStyleRow } from './NodeClassStyleRow';
import { ClassNamesEditor } from './ClassNamesEditor';
import { StyleRuleRow } from './StyleRuleRow';
import './styles-panel.css';

export function StylesPanel({ session, snap }: { session: EditorSession; snap: EditorSnapshot }) {
  const [state, setState] = useState<StyleStateName | ''>('');
  const names = useMemo(() => documentClassNames(toNested(snap.document)), [snap.document]);
  const breakpoints = editorBreakpoints(snap.document, snap.design);
  const viewport = viewportEditContext({
    breakpoints,
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const activeVariant = Boolean(snap.activeVariantName);
  const selectedNodeId = snap.selectedNodeId;
  const selectedClass = selectedNodeId ? names.get(selectedNodeId) : undefined;
  const visibleRules = snap.activeDocument.styles?.rules ?? snap.document.styles?.rules ?? [];
  const baseRules = snap.document.styles?.rules ?? [];
  const baseRuleById = new Map(baseRules.map((rule) => [rule.id, rule]));
  const treeOrder = new Map<string, number>();
  let nextOrder = 0;
  const recordTreeOrder = (nodeId: string) => {
    treeOrder.set(nodeId, nextOrder++);
    const node = snap.activeDocument.nodes[nodeId];
    if (node?.type === 'frame') for (const childId of node.children) recordTreeOrder(childId);
  };
  recordTreeOrder(snap.activeDocument.rootId);
  const nodes = [...names.entries()]
    .filter(([nodeId]) => Boolean(snap.activeDocument.nodes[nodeId]))
    .map(([nodeId, className]) => ({ nodeId, className }))
    .sort(
      (left, right) =>
        (treeOrder.get(left.nodeId) ?? Number.MAX_SAFE_INTEGER) -
        (treeOrder.get(right.nodeId) ?? Number.MAX_SAFE_INTEGER),
    );

  function commitBlock(style: StyleBlock | null) {
    if (activeVariant && snap.activeVariantName) {
      session.execute({ type: 'setVariantStyleBlock', name: snap.activeVariantName, style });
    } else {
      session.execute({ type: 'setStyleBlock', style });
    }
  }

  function addRule() {
    if (activeVariant) return;
    const rootClass = names.get(snap.document.rootId);
    if (!rootClass) return;
    const rule: StyleRule = {
      id: createId(),
      selector: `.${rootClass}`,
      bindings: { [rootClass]: snap.document.rootId },
    };
    const current = structuredClone(snap.document.styles ?? {});
    commitBlock({ ...current, rules: [...(current.rules ?? []), rule] });
  }

  function moveRule(ruleId: string, direction: -1 | 1) {
    if (activeVariant) return;
    const currentRules = snap.document.styles?.rules ?? [];
    const index = currentRules.findIndex((rule) => rule.id === ruleId);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= currentRules.length) return;
    const rules = [...currentRules];
    [rules[index], rules[destination]] = [rules[destination]!, rules[index]!];
    commitBlock({ ...structuredClone(snap.document.styles ?? {}), rules });
  }

  return (
    <div className="styles-panel" data-testid="styles-panel">
      {selectedNodeId && selectedClass ? (
        <section className="styles-class-name-section" aria-label="Selected CSS class">
          <h3>CSS classes</h3>
          <ClassNamesEditor
            session={session}
            snap={snap}
            nodeId={selectedNodeId}
            className={selectedClass}
          />
          {activeVariant ? (
            <p className="meta">CSS classes are shared across variants. Switch to Base to edit.</p>
          ) : null}
        </section>
      ) : (
        <p className="meta">Select a local layer to edit its CSS classes.</p>
      )}

      <div className="styles-edit-context">
        <Field label="State">
          <Select
            name="styles-state"
            aria-label="Styles state"
            value={state}
            options={[
              { value: '', label: 'Normal' },
              { value: 'hover', label: 'hover' },
              { value: 'focus-visible', label: 'focus-visible' },
              { value: 'disabled', label: 'disabled' },
            ]}
            onCommit={(next) => setState(next as StyleStateName | '')}
          />
        </Field>
        <p className="meta">
          Editing {snap.activeVariantName ?? 'Base'} · {viewport.overrideViewport?.label ?? 'Base'}
          {state ? ` · ${state}` : ''}
        </p>
      </div>

      <section className="styles-source-section" aria-label="Class selectors">
        <h3>Class selectors</h3>
        <p className="meta">Each row edits the same declarations used by the Style inspector.</p>
        <div className="styles-source-list">
          {nodes.map(({ nodeId, className }) => (
            <NodeClassStyleRow
              key={nodeId}
              session={session}
              snap={snap}
              nodeId={nodeId}
              className={className}
              selected={selectedNodeId === nodeId}
              state={state}
              viewport={viewport}
            />
          ))}
        </div>
      </section>

      <section className="styles-source-section" aria-label="Style rules">
        <div className="styles-section-heading">
          <h3>Selector rules</h3>
          <button type="button" className="text-button" onClick={addRule} disabled={activeVariant}>
            Add rule
          </button>
        </div>
        {activeVariant ? (
          <p className="meta">Switch to Base to add, rename, reorder, or delete selector rules.</p>
        ) : (
          <p className="meta">
            Selectors can target local classes, siblings, states, and pseudo-elements.
          </p>
        )}
        <div className="styles-source-list">
          {visibleRules.map((rule, index) => (
            <StyleRuleRow
              key={rule.id}
              session={session}
              snap={snap}
              rule={rule}
              baseRule={baseRuleById.get(rule.id)}
              classNames={names}
              selectedNodeId={selectedNodeId}
              state={state}
              breakpointId={viewport.writingBreakpointId}
              breakpoints={breakpoints}
              index={index}
              count={visibleRules.length}
              onMove={(direction) => moveRule(rule.id, direction)}
            />
          ))}
          {visibleRules.length === 0 ? <p className="meta">No selector rules yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
