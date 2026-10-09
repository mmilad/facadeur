import type { FormFieldConfig } from '../field';
import type { AutocompleteOption } from '../fields/autocomplete/types';
import type { TextFieldRenderProps } from '../field/types';
import type { ReactNode } from 'react';

export type FormChangeMeta = {
  path: string;
  previous: unknown;
  next: unknown;
};

export type FormProps<T extends Record<string, unknown>> = {
  value: T;
  fields: readonly FormFieldConfig[];
  onChange: (next: T, meta: FormChangeMeta) => void;
  className?: string;
  layout?: 'stacked' | 'horizontal';
  bindOptions?: readonly AutocompleteOption[];
  renderTextField?: (props: TextFieldRenderProps) => ReactNode | undefined;
};
