import React from 'react';
import styles from './LayoutField.module.css';
import type { LayoutFieldProps } from './types';

export function LayoutField({ children }: LayoutFieldProps) {
  return (
    <div className={styles.layout} data-layout-type="column">
      {children}
    </div>
  );
}
