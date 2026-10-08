import { Field } from '../../../form/index';
import { LayoutChoiceIcon, LayoutIconChoice } from '../../../controls/layout/icon-choice';

const choices = [
  { value: 'auto', kind: 'default', label: 'Inherit', direction: '' },
  { value: 'flex-start', kind: 'start', label: 'Start', direction: 'Left' },
  { value: 'center', kind: 'center', label: 'Center', direction: 'Center' },
  { value: 'flex-end', kind: 'end', label: 'End', direction: 'Right' },
  { value: 'stretch', kind: 'stretch', label: 'Stretch', direction: 'Stretch' },
] as const;

/** Item-only alignment: never changes the parent's alignment or sibling values. */
export function SelfAlignment({
  value,
  horizontal,
  active,
  retained,
  fill,
  onCommit,
  onReset,
}: {
  value?: string;
  horizontal: boolean;
  active: boolean;
  retained: boolean;
  fill: boolean;
  onCommit: (value: string) => void;
  onReset?: () => void;
}) {
  if (!active && !retained && !value) return null;
  const selected =
    value === 'start' ? 'flex-start' : value === 'end' ? 'flex-end' : (value ?? 'auto');
  return (
    <Field label={`Self alignment (${horizontal ? 'Vertical' : 'Horizontal'})`}>
      <LayoutIconChoice
        label="Self alignment"
        value={selected}
        disabled={!active}
        options={choices.map((choice) => ({
          value: choice.value,
          label: `Self alignment: ${choice.label}`,
          title:
            choice.value === 'auto'
              ? 'Use parent alignment'
              : `${horizontal ? (choice.kind === 'start' ? 'Top' : choice.kind === 'end' ? 'Bottom' : choice.direction) : choice.direction} · ${choice.value}`,
          icon: <LayoutChoiceIcon kind={choice.kind} vertical={horizontal} cross />,
        }))}
        onCommit={onCommit}
      />
      {onReset ? (
        <button
          type="button"
          className="text-button"
          aria-label="Reset self alignment"
          onClick={onReset}
        >
          Reset
        </button>
      ) : null}
      {!active ? (
        <span className="eu-field__hint">
          Only active for an element in a flex parent, not in absolute positioning.
        </span>
      ) : (
        <span className="eu-field__hint">Aligns only this element, not its siblings.</span>
      )}
      {active && fill ? (
        <span className="eu-field__hint">
          Width is Fill. Use Hug to see left, center or right alignment.
        </span>
      ) : null}
      {value && !choices.some((choice) => choice.value === selected) ? (
        <span className="eu-field__hint">Current CSS value: {value}</span>
      ) : null}
    </Field>
  );
}
