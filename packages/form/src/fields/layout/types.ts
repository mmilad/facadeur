import type { FormFieldConfig } from '../../field';
import type { ReactNode } from 'react';

export type LayoutFieldConfig = {
  type: 'layout';
  fields: readonly FormFieldConfig[];
};

export type LayoutFieldProps = { children: ReactNode };
