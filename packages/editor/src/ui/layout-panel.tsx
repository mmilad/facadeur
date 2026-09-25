import { useEffect, useState } from 'react';
import {
  type AxisSize,
  type FlatNode,
  type LayoutOverride,
  type SizeValue,
  type Spacing,
  type SpacingBox,
} from '@facadeur/core';
import {
  clearLayoutBreakpoint,
  dimensionTokenRefs,
  layoutLayer,
  writeLayoutFields,
  type LayoutPatch,
} from '../editing.js';
import type { EditorSession, EditorSnapshot } from '../session.js';
import { editorBreakpoints, viewportEditContext } from '../viewport-edit.js';
import { OverrideCue } from './viewport-bar.js';

const JUSTIFY = ['start', 'center', 'end', 'space-between'] as const;
const ALIGN = ['start', 'center', 'end', 'stretch'] as const;

export function LayoutPanel({
  session,
  snap,
  node,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
  node: FlatNode;
}) {
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const breakpointId = ctx.writingBreakpointId;
  const layer = layoutLayer(node.layout, breakpointId);
  const base = node.layout ?? {};
  const tokens = dimensionTokenRefs(snap.design.tokens);
  const cueViewport = ctx.overrideViewport;

  function cue(key: keyof LayoutOverride) {
    if (!cueViewport) return null;
    const override = node.layout?.breakpoints?.[cueViewport.id];
    if (!override || override[key] === undefined) return null;
    return (
      <OverrideCue
        minWidth={cueViewport.minWidth}
        onReset={() =>
          session.execute({
            type: 'setProp',
            nodeId: node.id,
            prop: 'layout',
            value: writeLayoutFields(node.layout, cueViewport.id, { [key]: null }),
          })
        }
      />
    );
  }

  function shown<Key extends keyof LayoutOverride>(key: Key): LayoutOverride[Key] | undefined {
    if (layer[key] !== undefined) return layer[key];
    if (breakpointId === null) return undefined;
    return base[key];
  }

  function commit(patch: LayoutPatch) {
    session.execute({
      type: 'setProp',
      nodeId: node.id,
      prop: 'layout',
      value: writeLayoutFields(node.layout, breakpointId, patch),
    });
  }

  const position = shown('position') ?? 'auto';
  const free = position === 'absolute';
  const margin = shown('margin');

  return (
    <div className="stack">
      <h3>Layout</h3>
      {cueViewport && node.layout?.breakpoints?.[cueViewport.id] ? (
        <button
          type="button"
          className="text-button"
          onClick={() =>
            session.execute({
              type: 'setProp',
              nodeId: node.id,
              prop: 'layout',
              value: clearLayoutBreakpoint(node.layout, cueViewport.id),
            })
          }
        >
          Reset layout {cueViewport.id}
        </button>
      ) : null}
      {node.type === 'frame' ? (
        <>
          <label className="field">
            <span>Direction</span>
            <select
              name="layout-direction"
              value={shown('direction') ?? ''}
              onChange={(event) =>
                commit({
                  direction:
                    event.target.value === 'row' || event.target.value === 'column'
                      ? event.target.value
                      : null,
                })
              }
            >
              <option value="">Default (column)</option>
              <option value="column">Column</option>
              <option value="row">Row</option>
            </select>
          </label>
          {cue('direction')}
          <TokenField
            label="Gap"
            name="layout-gap"
            value={typeof shown('gap') === 'string' ? shown('gap') : undefined}
            tokens={tokens}
            onChange={(gap) => commit({ gap })}
          />
          {cue('gap')}
          <PaddingFields
            padding={shown('padding')}
            tokens={tokens}
            onChange={(padding) => commit({ padding })}
          />
          {cue('padding')}
          <ChoiceField
            label="Justify"
            name="layout-justify"
            value={shown('justify') ?? ''}
            options={JUSTIFY}
            onChange={(justify) =>
              commit({
                justify: JUSTIFY.find((item) => item === justify) ?? null,
              })
            }
          />
          {cue('justify')}
          <ChoiceField
            label="Align"
            name="layout-align"
            value={shown('align') ?? ''}
            options={ALIGN}
            onChange={(align) =>
              commit({
                align: ALIGN.find((item) => item === align) ?? null,
              })
            }
          />
          {cue('align')}
          <label className="field field-check">
            <span>Wrap</span>
            <input
              type="checkbox"
              name="layout-wrap"
              checked={shown('wrap') === true}
              onChange={(event) => {
                if (event.target.checked) commit({ wrap: true });
                else if (breakpointId === null) commit({ wrap: null });
                else commit({ wrap: false });
              }}
            />
          </label>
          {cue('wrap')}
        </>
      ) : null}
      <TokenField
        label="Margin"
        name="layout-margin"
        value={typeof margin === 'string' ? margin : undefined}
        tokens={tokens}
        onChange={(next) => commit({ margin: next })}
      />
      {cue('margin')}
      {margin && typeof margin === 'object' ? (
        <PaddingFields
          padding={margin}
          tokens={tokens}
          onChange={(next) => commit({ margin: next })}
          legend="Margin sides"
        />
      ) : null}
      <h3>Position</h3>
      <label className="field field-check">
        <span>Free position</span>
        <input
          type="checkbox"
          name="layout-free"
          checked={free}
          onChange={(event) => {
            if (event.target.checked) commit({ position: 'absolute' });
            else if (breakpointId === null) commit({ position: null, x: null, y: null });
            else commit({ position: 'auto', x: null, y: null });
          }}
        />
      </label>
      {cue('position')}
      {free ? (
        <div className="pair">
          <NumberField
            label="X"
            name="layout-x"
            value={shown('x')}
            onCommit={(x) => commit({ x })}
          />
          <NumberField
            label="Y"
            name="layout-y"
            value={shown('y')}
            onCommit={(y) => commit({ y })}
          />
        </div>
      ) : null}
      {cue('x')}
      {cue('y')}
      {!free ? <p className="meta">Arrow keys move only free-positioned elements.</p> : null}
      <h3>Sizing</h3>
      <AxisFields
        label="Width"
        name="width"
        axis={shown('width')}
        tokens={tokens}
        onChange={(width) => commit({ width })}
      />
      {cue('width')}
      <AxisFields
        label="Height"
        name="height"
        axis={shown('height')}
        tokens={tokens}
        onChange={(height) => commit({ height })}
      />
      {cue('height')}
    </div>
  );
}

function PaddingFields({
  padding,
  tokens,
  onChange,
  legend = 'Padding',
}: {
  padding: Spacing | undefined;
  tokens: string[];
  onChange: (padding: Spacing | null) => void;
  legend?: string;
}) {
  if (padding && typeof padding !== 'string') {
    return (
      <div className="stack">
        <p className="meta">{legend} per side</p>
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <TokenField
            key={side}
            label={side}
            name={`layout-padding-${side}`}
            value={padding[side]}
            tokens={tokens}
            onChange={(next) => onChange(boxWith(padding, side, next))}
          />
        ))}
        <button
          type="button"
          className="text-button"
          onClick={() =>
            onChange(padding.top ?? padding.right ?? padding.bottom ?? padding.left ?? null)
          }
        >
          One token
        </button>
      </div>
    );
  }
  return (
    <div className="stack">
      <TokenField
        label={legend}
        name="layout-padding"
        value={padding}
        tokens={tokens}
        onChange={onChange}
      />
      {padding ? (
        <button
          type="button"
          className="text-button"
          onClick={() => onChange({ top: padding, right: padding, bottom: padding, left: padding })}
        >
          Per side
        </button>
      ) : null}
    </div>
  );
}

function boxWith(box: SpacingBox, side: keyof SpacingBox, value: string | null): SpacingBox | null {
  const next: SpacingBox = { ...box };
  if (value) next[side] = value;
  else delete next[side];
  return next.top || next.right || next.bottom || next.left ? next : null;
}

function AxisFields({
  label,
  name,
  axis,
  tokens,
  onChange,
}: {
  label: string;
  name: 'width' | 'height';
  axis: AxisSize | undefined;
  tokens: string[];
  onChange: (axis: AxisSize | null) => void;
}) {
  const mode = axis?.mode ?? '';
  function rebuild(next: AxisSize | null) {
    onChange(next);
  }
  return (
    <div className="stack">
      <label className="field">
        <span>{label}</span>
        <select
          name={`layout-${name}`}
          value={mode}
          onChange={(event) => {
            const value = event.target.value;
            if (value !== 'hug' && value !== 'fill' && value !== 'fixed') {
              rebuild(null);
              return;
            }
            if (value === 'fixed') {
              rebuild({
                mode: 'fixed',
                size: axis?.mode === 'fixed' && axis.size !== undefined ? axis.size : 100,
                ...(axis?.min !== undefined ? { min: axis.min } : {}),
                ...(axis?.max !== undefined ? { max: axis.max } : {}),
              });
              return;
            }
            rebuild({
              mode: value,
              ...(axis?.min !== undefined ? { min: axis.min } : {}),
              ...(axis?.max !== undefined ? { max: axis.max } : {}),
            });
          }}
        >
          <option value="">Default</option>
          <option value="hug">Hug</option>
          <option value="fill">Fill</option>
          <option value="fixed">Fixed</option>
        </select>
      </label>
      {mode === 'fixed' ? (
        <SizeValueField
          label={`${label} size`}
          name={`layout-${name}-size`}
          value={axis?.size}
          tokens={tokens}
          allowEmpty={false}
          onChange={(size) => {
            if (size === null) return;
            rebuild({
              mode: 'fixed',
              size,
              ...(axis?.min !== undefined ? { min: axis.min } : {}),
              ...(axis?.max !== undefined ? { max: axis.max } : {}),
            });
          }}
        />
      ) : null}
      <SizeValueField
        label={`Min ${label.toLowerCase()}`}
        name={`layout-${name}-min`}
        value={axis?.min}
        tokens={tokens}
        allowEmpty
        onChange={(min) => {
          if (!axis) {
            if (min === null) return;
            rebuild({ mode: 'hug', min });
            return;
          }
          const next: AxisSize = {
            mode: axis.mode,
            ...(axis.size !== undefined ? { size: axis.size } : {}),
          };
          if (min !== null) next.min = min;
          if (axis.max !== undefined) next.max = axis.max;
          rebuild(next);
        }}
      />
      <SizeValueField
        label={`Max ${label.toLowerCase()}`}
        name={`layout-${name}-max`}
        value={axis?.max}
        tokens={tokens}
        allowEmpty
        onChange={(max) => {
          if (!axis) {
            if (max === null) return;
            rebuild({ mode: 'hug', max });
            return;
          }
          const next: AxisSize = {
            mode: axis.mode,
            ...(axis.size !== undefined ? { size: axis.size } : {}),
          };
          if (axis.min !== undefined) next.min = axis.min;
          if (max !== null) next.max = max;
          rebuild(next);
        }}
      />
    </div>
  );
}

function SizeValueField({
  label,
  name,
  value,
  tokens,
  allowEmpty,
  onChange,
}: {
  label: string;
  name: string;
  value: SizeValue | undefined;
  tokens: string[];
  allowEmpty: boolean;
  onChange: (value: SizeValue | null) => void;
}) {
  const kind =
    value === undefined
      ? ''
      : typeof value === 'number'
        ? 'px'
        : typeof value === 'string'
          ? 'token'
          : 'percent';
  const tokenValue = typeof value === 'string' ? value : (tokens[0] ?? '');
  const pxValue = typeof value === 'number' ? value : 100;
  const percentValue = typeof value === 'object' ? value.value : 100;
  return (
    <div className="pair">
      <label className="field">
        <span>{label}</span>
        <select
          name={`${name}-kind`}
          value={kind}
          onChange={(event) => {
            const next = event.target.value;
            if (next === '') onChange(null);
            else if (next === 'px') onChange(pxValue > 0 ? pxValue : 100);
            else if (next === 'token') {
              if (tokenValue) onChange(tokenValue);
            } else onChange({ unit: '%', value: percentValue > 0 ? percentValue : 100 });
          }}
        >
          {allowEmpty ? <option value="">None</option> : null}
          <option value="px">px</option>
          <option value="token">Token</option>
          <option value="percent">%</option>
        </select>
      </label>
      {kind === 'px' ? (
        <NumberField
          label="px"
          name={name}
          value={pxValue}
          onCommit={(next) => {
            if (next !== null && next > 0) onChange(next);
          }}
        />
      ) : null}
      {kind === 'token' ? (
        <TokenField
          label="Token"
          name={name}
          value={typeof value === 'string' ? value : undefined}
          tokens={tokens}
          allowEmpty={false}
          onChange={(next) => {
            if (next) onChange(next);
          }}
        />
      ) : null}
      {kind === 'percent' ? (
        <NumberField
          label="%"
          name={name}
          value={percentValue}
          onCommit={(next) => {
            if (next !== null && next > 0 && next <= 100) onChange({ unit: '%', value: next });
          }}
        />
      ) : null}
    </div>
  );
}

function TokenField({
  label,
  name,
  value,
  tokens,
  allowEmpty = true,
  onChange,
}: {
  label: string;
  name: string;
  value: string | undefined;
  tokens: string[];
  allowEmpty?: boolean;
  onChange: (value: string | null) => void;
}) {
  const options = value && !tokens.includes(value) ? [value, ...tokens] : tokens;
  return (
    <label className="field">
      <span>{label}</span>
      <select
        name={name}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value ? event.target.value : null)}
      >
        {allowEmpty ? <option value="">None</option> : null}
        {options.map((token) => (
          <option key={token} value={token}>
            {token}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChoiceField({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Default</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  name,
  value,
  onCommit,
}: {
  label: string;
  name: string;
  value: number | undefined;
  onCommit: (value: number | null) => void;
}) {
  const shown = value === undefined ? '' : String(value);
  const [draft, setDraft] = useState(shown);
  useEffect(() => {
    setDraft(shown);
  }, [shown]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim() === '') {
            onCommit(null);
            return;
          }
          const next = Number(draft);
          if (Number.isFinite(next)) onCommit(next);
          else setDraft(shown);
        }}
      />
    </label>
  );
}
