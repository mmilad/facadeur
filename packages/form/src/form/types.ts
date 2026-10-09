import type { FormFieldConfig } from '../field';

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
  bindOptions?: readonly { value: string; label: string }[];
};
