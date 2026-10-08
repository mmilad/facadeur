import { useEffect, useState } from 'react';
import {
  assertStyleSelector,
  bindStyleRuleSelector,
  renderStyleRuleSelector,
  type StyleBlock,
  type StyleRule,
} from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import {
  variantStyleBlock,
  type StyleBreakpointRef,
  type StyleStateName,
} from '../../../../domain/edits/style-edit';
import {
  ensureStyleRule,
  readStyleRuleFallback,
  readStyleRuleDeclarations,
  replaceStyleRuleDeclarations,
} from '../../../../domain/style-rules/style-rule-edit';
import {
  formatCssDeclarations,
  parseCssDeclarations,
} from '../../../../domain/style-rules/css-declarations';

export function StyleRuleRow({
  session,
  snap,
  rule,
  baseRule,
  classNames,
  selectedNodeId,
  state,
  breakpointId,
  breakpoints,
  index,
  count,
  onMove,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  rule: StyleRule;
  baseRule?: StyleRule;
  classNames: ReadonlyMap<string, string>;
  selectedNodeId: string | null;
  state: StyleStateName | '';
  breakpointId: string | null;
  breakpoints: readonly StyleBreakpointRef[];
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  const displayedSelector = safeDisplaySelector(rule, classNames);
  const [selectorDraft, setSelectorDraft] = useState(displayedSelector);
  const [selectorError, setSelectorError] = useState('');
  const target = {
    ...(state ? { state } : {}),
    ...(breakpointId ? { breakpointId } : {}),
  };
  const visibleDeclarations = readStyleRuleDeclarations(rule, target, breakpoints);
  const visibleText = formatCssDeclarations(visibleDeclarations);
  const [draft, setDraft] = useState(visibleText);
  const [error, setError] = useState('');
  const isVariant = Boolean(snap.activeVariantName);
  const selected = selectedNodeId !== null && Object.values(rule.bindings).includes(selectedNodeId);

  useEffect(() => {
    setSelectorDraft(displayedSelector);
    setSelectorError('');
  }, [displayedSelector, rule.id]);
  useEffect(() => {
    setDraft(visibleText);
    setError('');
  }, [visibleText, rule.id]);

  function editableBlock(): StyleBlock | undefined {
    if (snap.activeVariantName) return variantStyleBlock(snap.document, snap.activeVariantName);
    return snap.document.styles;
  }

  function commitBlock(style: StyleBlock | null) {
    if (snap.activeVariantName) {
      session.execute({ type: 'setVariantStyleBlock', name: snap.activeVariantName, style });
    } else {
      session.execute({ type: 'setStyleBlock', style });
    }
  }

  function commitSelector(valueDraft = selectorDraft) {
    if (isVariant) return;
    const value = valueDraft.trim();
    try {
      assertStyleSelector(value);
      const css = globalThis.CSS;
      if (css && typeof css.supports === 'function' && !css.supports(`selector(${value})`)) {
        throw new Error('The browser does not support this selector syntax.');
      }
      const bindings = bindStyleRuleSelector(value, classNames);
      const current = editableBlock() ?? {};
      const prepared = ensureStyleRule(current, rule);
      const rules = (prepared.rules ?? []).map((candidate) =>
        candidate.id === rule.id ? { ...candidate, selector: value, bindings } : candidate,
      );
      commitBlock({ ...prepared, rules });
      setSelectorError('');
    } catch (cause) {
      setSelectorError(cause instanceof Error ? cause.message : 'Invalid selector.');
    }
  }

  function commitCss(value: string) {
    const parsed = parseCssDeclarations(value);
    if (!parsed.ok) {
      setError(`${parsed.error.message} (at character ${parsed.error.offset + 1})`);
      return;
    }
    const source = editableBlock();
    const layerTarget = {
      ...(state ? { state } : {}),
      ...(breakpointId ? { breakpointId } : {}),
    };
    const lowerLayer =
      state || breakpointId
        ? readStyleRuleFallback(rule, layerTarget, breakpoints)
        : isVariant && baseRule
          ? readStyleRuleDeclarations(baseRule, {}, breakpoints)
          : {};
    const sparse = Object.fromEntries(
      Object.entries(parsed.declarations).filter(
        ([property, value]) => lowerLayer[property] !== value,
      ),
    );
    const prepared = ensureStyleRule(source, rule);
    const next = replaceStyleRuleDeclarations(
      prepared,
      rule.id,
      { ...(state ? { state } : {}), ...(breakpointId ? { breakpointId } : {}) },
      sparse,
    );
    commitBlock(next);
    setError('');
  }

  return (
    <details className={selected ? 'styles-source-row is-selected' : 'styles-source-row'}>
      <summary>
        <code>{displayedSelector}</code>
        {selected ? <span className="styles-source-kind">Selected target</span> : null}
        {isVariant ? <span className="styles-source-kind">Variant layer</span> : null}
      </summary>
      <div className="styles-row-actions">
        <button
          type="button"
          className="text-button"
          aria-label={`Move rule ${rule.id} up`}
          disabled={isVariant || index === 0}
          onClick={() => onMove(-1)}
        >
          Up
        </button>
        <button
          type="button"
          className="text-button"
          aria-label={`Move rule ${rule.id} down`}
          disabled={isVariant || index === count - 1}
          onClick={() => onMove(1)}
        >
          Down
        </button>
        <button
          type="button"
          className="text-button"
          aria-label={`Delete rule ${rule.id}`}
          disabled={isVariant}
          onClick={() => {
            const current = editableBlock();
            if (!current) return;
            commitBlock({
              ...current,
              rules: current.rules?.filter((candidate) => candidate.id !== rule.id),
            });
          }}
        >
          Delete
        </button>
      </div>
      <label className="styles-selector-editor">
        <span>Selector</span>
        <input
          aria-label={`Selector ${rule.id}`}
          value={selectorDraft}
          disabled={isVariant}
          onChange={(event) => {
            setSelectorDraft(event.currentTarget.value);
            setSelectorError('');
          }}
          onBlur={(event) => commitSelector(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            event.currentTarget.blur();
          }}
        />
      </label>
      {selectorError ? (
        <p className="style-rule-error" role="alert">
          {selectorError}
        </p>
      ) : null}
      <label className="styles-css-editor">
        <span>CSS declarations</span>
        <textarea
          aria-label={`CSS ${rule.id}`}
          name={`css-${rule.id}`}
          rows={Math.max(3, Math.min(12, Object.keys(visibleDeclarations).length + 1))}
          value={draft}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
            setError('');
          }}
          onBlur={(event) => commitCss(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            commitCss(event.currentTarget.value);
          }}
        />
      </label>
      {error ? (
        <p className="style-rule-error" role="alert">
          {error}
        </p>
      ) : null}
    </details>
  );
}

function safeDisplaySelector(rule: StyleRule, names: ReadonlyMap<string, string>): string {
  try {
    return renderStyleRuleSelector(rule, names);
  } catch {
    return rule.selector;
  }
}
