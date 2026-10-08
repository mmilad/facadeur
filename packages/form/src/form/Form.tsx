import { useId } from 'react';
import { FormField } from '../field';
import styles from './Form.module.css';
import type { FormProps } from './types';

export function Form<T extends Record<string, unknown>>({
  value,
  fields,
  onChange,
  className,
  layout = 'stacked',
}: FormProps<T>) {
  const id = useId();
  const classNames = [styles.form, className].filter(Boolean).join(' ');

  return (
    <div className={classNames} data-layout={layout}>
      {fields.map((field, index) => (
        <FormField
          key={field.name}
          field={field}
          id={`${id}-${index}`}
          layout={layout}
          value={value[field.name]}
          onChange={(next) => {
            const previous = value[field.name];
            if (Object.is(previous, next)) return;
            onChange({ ...value, [field.name]: next }, { path: field.name, previous, next });
          }}
        />
      ))}
    </div>
  );
}
