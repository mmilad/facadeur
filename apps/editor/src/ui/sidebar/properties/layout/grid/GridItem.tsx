import { useRef, useState } from 'react';
import { Field } from '../../../../form/index';
import { LayoutChoiceIcon, LayoutIconChoice } from '../../../../controls/layout/icon-choice';

export interface GridItemProps {
  values: Record<string, string>;
  onCommit: (property: string, value: string | null) => void;
  onPatch?: (patch: Record<string, string | null>) => void;
  overridden?: (property: string) => boolean;
  active: boolean;
  areaNames?: readonly string[];
  areaTemplateError?: string;
  guidedOnly?: boolean;
}

const alignment = ['auto', 'start', 'center', 'end', 'stretch'] as const;
const placement = ['grid-column', 'grid-row'] as const;

/** Controlled CSS fields; the caller owns cascade resolution and Undo transactions. */
export function GridItem({
  values,
  onCommit,
  onPatch,
  overridden,
  active,
  areaNames = [],
  areaTemplateError,
  guidedOnly = false,
}: GridItemProps) {
  const area = values['grid-area'] ?? 'auto';
  const names = [...new Set(areaNames)].filter((name) => name !== 'auto');
  const unknownArea = area !== 'auto' && !names.includes(area);
  const missingArea = unknownArea && isAreaName(area);
  const namedArea = names.includes(area) || isAreaName(area);
  function commit(property: string, value: string | null) {
    if (onPatch) onPatch({ [property]: value });
    else onCommit(property, value);
  }
  function assignArea(value: string) {
    if (!active) return;
    if (onPatch) {
      onPatch({
        'grid-column': null,
        'grid-row': null,
        ...areaLonghands(value),
        'grid-area': value,
      });
    } else onCommit('grid-area', value);
  }
  function commitPlacement(property: (typeof placement)[number], value: string | null) {
    if (!active) return;
    if (onPatch) {
      const patch: Record<string, string | null> = {
        [property]: value,
        ...axisLonghands(property, value),
      };
      if (namedArea) {
        patch['grid-area'] = 'auto';
        const other = property === 'grid-column' ? 'grid-row' : 'grid-column';
        const fallback = axisLonghands(other, values[other] ?? `${area} / ${area}`);
        patch[`${other}-start`] = values[`${other}-start`] ?? fallback[`${other}-start`]!;
        patch[`${other}-end`] = values[`${other}-end`] ?? fallback[`${other}-end`]!;
      }
      onPatch(patch);
    } else commit(property, value);
  }
  function resetArea() {
    if (onPatch) {
      onPatch({
        'grid-area': null,
        'grid-column-start': null,
        'grid-column-end': null,
        'grid-row-start': null,
        'grid-row-end': null,
      });
    } else onCommit('grid-area', null);
  }
  function reset(property: string) {
    return (overridden ? overridden(property) : values[property] !== undefined) ? (
      <button
        type="button"
        className="text-button"
        aria-label={`Reset ${property}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (property === 'grid-area') resetArea();
          else if (onPatch && (property === 'grid-column' || property === 'grid-row')) {
            onPatch({
              [property]: null,
              [`${property}-start`]: null,
              [`${property}-end`]: null,
            });
          } else commit(property, null);
        }}
      >
        Reset
      </button>
    ) : null;
  }
  return (
    <div className="stack" aria-label="Grid item">
      {!active ? (
        <span className="eu-field__hint">
          Grid item fields are only active in a grid parent, outside absolute positioning.
        </span>
      ) : null}
      <Field label="Grid area">
        <select
          aria-label="Grid area"
          value={area}
          disabled={!active}
          onChange={(event) => {
            if (event.target.value !== area) assignArea(event.target.value);
          }}
        >
          <option value="auto">Auto</option>
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          {unknownArea ? <option value={area}>{area} (current)</option> : null}
        </select>
        {!guidedOnly ? (
          <CssInput
            key={`grid-area:${values['grid-area'] ?? ''}:${active}`}
            label="grid-area CSS"
            value={values['grid-area'] ?? ''}
            placeholder="auto"
            disabled={!active}
            property="grid-area"
            onCommit={(next) => {
              if (next) assignArea(next);
              else resetArea();
            }}
          />
        ) : null}
        {missingArea ? (
          <span className="eu-field__hint" role="status">
            Area “{area}” is missing from this parent at the current viewport.
          </span>
        ) : null}
        {areaTemplateError ? (
          <span className="eu-field__hint" role="status">
            {areaTemplateError}
          </span>
        ) : null}
        {!onPatch ? (
          <span className="eu-field__hint">
            Area changes retain existing row and column placement.
          </span>
        ) : null}
        {overridden?.('grid-area') ? reset('grid-area') : null}
      </Field>
      {placement.map((property) => {
        const hasLonghands =
          values[`${property}-start`] !== undefined || values[`${property}-end`] !== undefined;
        const value =
          guidedOnly && hasLonghands
            ? `${values[`${property}-start`] ?? 'auto'} / ${values[`${property}-end`] ?? 'auto'}`
            : values[property];
        const simplifiedValue = value?.replace(/\s*\/\s*auto\s*$/, '');
        const simple = /^(auto|-?[1-9]\d*)(?:\s*\/\s*span\s+([1-9]\d*))?$/.exec(
          simplifiedValue ?? 'auto',
        );
        return (
          <Field key={property} label={property === 'grid-column' ? 'Grid column' : 'Grid row'}>
            {!guidedOnly ? (
              <CssInput
                key={`${property}:${value ?? ''}:${active}`}
                label={`${property} CSS`}
                value={value ?? ''}
                placeholder="auto"
                disabled={!active}
                property={property}
                onCommit={(next) => commitPlacement(property, next)}
              />
            ) : null}
            {simple ? (
              <div className="inline">
                <CssInput
                  key={`${property}:start:${value ?? ''}:${active}`}
                  label={`${property} start`}
                  value={simple[1] === 'auto' ? '' : simple[1]!}
                  placeholder="auto"
                  disabled={!active}
                  property={`${property}-start`}
                  onCommit={(next) =>
                    commitPlacement(
                      property,
                      `${next ?? 'auto'}${simple[2] ? ` / span ${simple[2]}` : ''}`,
                    )
                  }
                />
                <CssInput
                  key={`${property}:span:${value ?? ''}:${active}`}
                  label={`${property} span`}
                  value={simple[2] ?? ''}
                  placeholder="auto"
                  disabled={!active}
                  property={`${property}-end`}
                  span
                  onCommit={(next) =>
                    commitPlacement(property, `${simple[1]}${next ? ` / span ${next}` : ''}`)
                  }
                />
              </div>
            ) : (
              <span className="eu-field__hint">Current CSS value: {value}</span>
            )}
            {value !== undefined && overridden && !overridden(property) ? (
              <span className="eu-field__hint">
                Inherited {property}: {value}. This value is retained in the underlying style layer.
              </span>
            ) : null}
            {namedArea ? (
              <span className="eu-field__hint">
                {onPatch
                  ? `Editing ${property} switches grid-area to auto and retains the other axis placement.`
                  : `Editing ${property} retains grid-area ${area}; the area may conflict with manual placement.`}
              </span>
            ) : null}
            {reset(property)}
          </Field>
        );
      })}
      {(['justify-self', 'align-self'] as const).map((property) => {
        const value = values[property] ?? 'auto';
        return (
          <Field
            key={property}
            label={`${property} (${property === 'justify-self' ? 'Horizontal' : 'Vertical'})`}
          >
            <LayoutIconChoice
              label={property}
              value={value}
              disabled={!active}
              options={alignment.map((option) => ({
                value: option,
                label: `${property}: ${option}`,
                title: `${property}: ${option}`,
                icon: (
                  <LayoutChoiceIcon
                    kind={option === 'auto' ? 'default' : option}
                    vertical={property === 'align-self'}
                    cross
                  />
                ),
              }))}
              onCommit={(next) => commit(property, next)}
            />
            {!alignment.some((option) => option === value) ? (
              <span className="eu-field__hint">Current CSS value: {value}</span>
            ) : null}
            {reset(property)}
          </Field>
        );
      })}
    </div>
  );
}

function axisLonghands(property: string, value: string | null) {
  const parts = gridLines(value ?? 'auto');
  return {
    [`${property}-start`]: parts[0] || 'auto',
    [`${property}-end`]: parts[1] || 'auto',
  };
}

function areaLonghands(value: string) {
  const parts = gridLines(value);
  const rowStart = parts[0] || 'auto';
  const columnStart = parts[1] || (isAreaName(rowStart) ? rowStart : 'auto');
  return {
    'grid-row-start': rowStart,
    'grid-column-start': columnStart,
    'grid-row-end': parts[2] || (isAreaName(rowStart) ? rowStart : 'auto'),
    'grid-column-end': parts[3] || (isAreaName(columnStart) ? columnStart : 'auto'),
  };
}

/** Slashes inside CSS functions belong to the value, not the grid shorthand. */
function gridLines(value: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '(') depth++;
    else if (value[index] === ')') depth--;
    else if (value[index] === '/' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

/** Recognize plain custom identifiers for missing-name feedback, without parsing templates. */
function isAreaName(value: string) {
  return (
    /^(?:--|-?(?:[_a-zA-Z]|[\u0080-\u{10ffff}]))(?:[-_a-zA-Z0-9]|[\u0080-\u{10ffff}])*$/u.test(
      value,
    ) &&
    !['auto', 'span', 'initial', 'inherit', 'unset', 'revert', 'revert-layer'].includes(
      value.toLowerCase(),
    )
  );
}

function CssInput({
  label,
  value,
  placeholder,
  disabled,
  property,
  span = false,
  onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  property: string;
  span?: boolean;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const committed = useRef(value);
  function save() {
    if (disabled || draft === committed.current) return;
    const next = draft.trim();
    const valid =
      !next ||
      (span
        ? /^[1-9]\d*$/.test(next)
        : typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
          ? CSS.supports(property, next)
          : !/[;{}]/.test(next));
    setInvalid(!valid);
    if (!valid) return;
    committed.current = draft;
    onCommit(next || null);
  }
  return (
    <input
      aria-label={label}
      aria-invalid={invalid}
      title={invalid ? 'Enter a valid CSS value' : undefined}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => {
        setDraft(event.target.value);
        setInvalid(false);
      }}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          save();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setDraft(committed.current);
          setInvalid(false);
        }
      }}
    />
  );
}
