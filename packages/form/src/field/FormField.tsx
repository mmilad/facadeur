import { TextField } from '../fields/text';
import styles from './FormField.module.css';
import type { FormFieldProps } from './types';

export function FormField({ field, id, layout, value, onChange }: FormFieldProps) {
  switch (field.type) {
    case 'text':
      return (
        <div className={[styles.field, styles[layout]].join(' ')}>
          <label className={styles.label} htmlFor={id}>
            {field.label}
          </label>
          <TextField
            id={id}
            name={field.name}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            disabled={field.disabled}
            onChange={onChange}
          />
        </div>
      );
  }
}
