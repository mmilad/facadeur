import styles from './SegmentedControlField.module.css';
import type { SegmentedControlFieldProps } from './types';

export function SegmentedControlField({
  id,
  label,
  value,
  options,
  disabled,
  invalid,
  onChange,
}: SegmentedControlFieldProps) {
  return (
    <div
      id={id}
      className={styles.group}
      role="group"
      aria-label={label}
      aria-invalid={invalid || undefined}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled || option.disabled}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
