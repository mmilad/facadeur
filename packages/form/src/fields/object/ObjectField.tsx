import React from 'react';
import { Form } from '../../form/Form';
import styles from './ObjectField.module.css';
import type { ObjectFieldProps } from './types';

export function ObjectField({ label, fields, value, onChange }: ObjectFieldProps) {
  return (
    <fieldset className={styles.object}>
      <legend className={styles.legend}>{label}</legend>
      <Form value={value} fields={fields} onChange={onChange} />
    </fieldset>
  );
}
