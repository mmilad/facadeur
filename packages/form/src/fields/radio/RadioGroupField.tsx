import styles from './RadioGroupField.module.css';
import type { RadioGroupFieldProps } from './types';

export function RadioGroupField({
  id,
  name,
  label,
  value,
  options,
  disabled,
  invalid,
  onChange,
}: RadioGroupFieldProps) {
  const labelId = label ? `${id}-label` : undefined;
  return (
    <div className={styles.group} role="radiogroup" aria-labelledby={labelId}>
      {label ? (
        <span className={styles.label} id={labelId}>
          {label}
        </span>
      ) : null}
      {options.map((option) => (
        <label className={styles.option} key={option.value}>
          <input
            type="radio"
            name={name ?? id}
            value={option.value}
            checked={value === option.value}
            disabled={disabled || option.disabled}
            aria-invalid={invalid || undefined}
            onChange={() => onChange(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
