import { Field, NumberInput, Stack, TextInput } from '../../../../form/index';
import { LayoutChoiceIcon, LayoutIconChoice } from '../../../../controls/layout/icon-choice';
import { TokenValueControl } from '../../../../controls/fields/TokenValueControl';
import '../../../../form/form.css';

export interface GridContainerProps {
  values: Record<string, string>;
  dimensionTokens: readonly string[];
  onCommit: (property: string, value: string | null) => void;
  onPatch?: (patch: Record<string, string | null>) => void;
  overridden?: (property: string) => boolean;
  guidedOnly?: boolean;
}

/** Recognize only the equal-track syntax this control produces. Other CSS stays custom. */
function equalColumnCount(value: string): number | null {
  const match = /^\s*repeat\(\s*([1-9]\d*)\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)\s*$/i.exec(value);
  const count = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(count) ? count : null;
}

/** Split shorthand only at top-level whitespace, preserving functions and token refs. */
function gapFallback(value: string): readonly string[] {
  if (/\/\*|\*\//.test(value)) return [];
  const parts: string[] = [];
  const closing: string[] = [];
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!;
    if (char === '(' || char === '{') closing.push(char === '(' ? ')' : '}');
    else if (char === ')' || char === '}') {
      if (closing.pop() !== char) return [];
    } else if (/\s/.test(char) && closing.length === 0) {
      if (start < index) parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (closing.length) return [];
  if (start < value.length) parts.push(value.slice(start));
  return parts.length <= 2 ? parts : [];
}

const itemChoices = ['start', 'center', 'end', 'stretch'] as const;
const contentChoices = [...itemChoices, 'space-between', 'space-around', 'space-evenly'] as const;
const alignmentFields = [
  { property: 'justify-items', label: 'Horizontal items', vertical: false, items: true },
  { property: 'align-items', label: 'Vertical items', vertical: true, items: true },
  { property: 'justify-content', label: 'Horizontal content', vertical: false, items: false },
  { property: 'align-content', label: 'Vertical content', vertical: true, items: false },
] as const;

export function GridContainer({
  values,
  dimensionTokens,
  onCommit,
  overridden,
  guidedOnly = false,
}: GridContainerProps) {
  const columns = values['grid-template-columns'] ?? '';
  const rows = values['grid-template-rows'] ?? '';
  const count = equalColumnCount(columns);
  const gap = gapFallback(values.gap ?? '');
  const gapValue = (property: 'column-gap' | 'row-gap') =>
    values[property] ?? (property === 'row-gap' ? gap[0] : (gap[1] ?? gap[0])) ?? '';
  const commitText = (property: string, value: string) =>
    onCommit(property, value.trim() ? value : null);
  const reset = (property: string) =>
    (overridden ? overridden(property) : Boolean(values[property])) ? (
      <button
        type="button"
        className="text-button"
        aria-label={`Reset ${property}`}
        onClick={() => onCommit(property, null)}
      >
        Reset
      </button>
    ) : null;

  return (
    <Stack gap={12}>
      <Field label="Equal columns">
        <NumberInput
          aria-label="Equal columns count"
          value={count}
          min={1}
          step={1}
          placeholder="Custom"
          onCommit={(next) => {
            if (next !== null && Number.isSafeInteger(next) && next > 0) {
              onCommit('grid-template-columns', `repeat(${next}, minmax(0, 1fr))`);
            }
          }}
        />
        {guidedOnly ? reset('grid-template-columns') : null}
      </Field>
      {!guidedOnly ? (
        <Field
          label="Column tracks"
          hint="Custom CSS is preserved. Set a count to use equal columns."
        >
          <TextInput
            aria-label="Custom column tracks"
            value={columns}
            placeholder="e.g. 200px 1fr"
            onCommit={(next) => commitText('grid-template-columns', next)}
          />
          {reset('grid-template-columns')}
        </Field>
      ) : columns && count === null ? (
        <span className="eu-field__hint">Custom columns — edit in Manual CSS properties.</span>
      ) : null}
      {guidedOnly ? (
        <Field label="Equal rows">
          <NumberInput
            aria-label="Equal rows count"
            value={equalColumnCount(rows)}
            min={1}
            step={1}
            placeholder="Auto / custom"
            onCommit={(next) => {
              if (next !== null && Number.isSafeInteger(next) && next > 0)
                onCommit('grid-template-rows', `repeat(${next}, minmax(0, 1fr))`);
            }}
          />
          <button
            type="button"
            className="text-button"
            aria-label="Use auto rows"
            onClick={() => onCommit('grid-template-rows', 'auto')}
          >
            Auto
          </button>
          {reset('grid-template-rows')}
          {rows && rows !== 'auto' && equalColumnCount(rows) === null ? (
            <span className="eu-field__hint">Custom rows — edit in Manual CSS properties.</span>
          ) : null}
        </Field>
      ) : (
        <Field label="Row tracks">
          <TextInput
            aria-label="Custom row tracks"
            value={rows}
            placeholder="auto"
            onCommit={(next) => commitText('grid-template-rows', next)}
          />
          <button
            type="button"
            className="text-button"
            aria-label="Use auto rows"
            onClick={() => onCommit('grid-template-rows', 'auto')}
          >
            Auto
          </button>
          {reset('grid-template-rows')}
        </Field>
      )}
      {(['column-gap', 'row-gap'] as const).map((property) => (
        <Field key={property} label={property === 'column-gap' ? 'Column gap' : 'Row gap'}>
          <TokenValueControl
            name={`grid-${property}-token`}
            label={property === 'column-gap' ? 'Column gap token' : 'Row gap token'}
            value={gapValue(property)}
            tokens={dimensionTokens}
            tokenOnly
            onCommit={(next) => onCommit(property, next)}
          />
          {reset(property)}
        </Field>
      ))}
      {alignmentFields.map(({ property, label, vertical, items }) => {
        const choices = items ? itemChoices : contentChoices;
        const current = values[property] ?? '';
        return (
          <Field key={property} label={label}>
            <LayoutIconChoice
              label={label}
              value={current}
              options={[
                {
                  value: '',
                  label: `${label}: Default`,
                  icon: <LayoutChoiceIcon kind="default" />,
                },
                ...choices.map((value) => ({
                  value,
                  label: `${label}: ${value}`,
                  title: `${property}: ${value}`,
                  icon:
                    value === 'space-around' || value === 'space-evenly' ? (
                      <DistributionIcon evenly={value === 'space-evenly'} vertical={vertical} />
                    ) : (
                      <LayoutChoiceIcon kind={value} vertical={vertical} cross={items} />
                    ),
                })),
              ]}
              onCommit={(next) => onCommit(property, next || null)}
            />
            {current && !choices.some((choice) => choice === current) ? (
              <span className="eu-field__hint">Current CSS value: {current}</span>
            ) : null}
            {reset(property)}
          </Field>
        );
      })}
    </Stack>
  );
}

function DistributionIcon({ evenly, vertical }: { evenly: boolean; vertical: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={vertical ? 'rotate(90 12 12)' : undefined}>
        <path d="M2 2v20M22 2v20" />
        <rect x={evenly ? 7 : 5} y="5" width="3" height="14" />
        <rect x={evenly ? 14 : 16} y="5" width="3" height="14" />
        <path d={evenly ? 'M3 12h3M11 12h2M18 12h3' : 'M3 12h1M9 12h6M20 12h1'} />
      </g>
    </svg>
  );
}
