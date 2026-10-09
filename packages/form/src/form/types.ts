import type { FormFieldConfig } from '../field';
import type { AutocompleteOption } from '../fields/autocomplete/types';

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
};
