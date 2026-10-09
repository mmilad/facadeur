import type { FormChangeMeta } from '../../form/types';
import type { FormFieldConfig } from '../../field';
import type { SelectOption } from '../select';

export type RepeaterFieldConfig = {
  name: string;
  label: string;
  type: 'repeater';
  itemLabel: string;
  itemFields: readonly FormFieldConfig[];
  createItem: Readonly<Record<string, unknown>>;
};

export type RepeaterFieldProps = Omit<RepeaterFieldConfig, 'name' | 'type'> & {
  value: readonly Record<string, unknown>[];
  bindOptions?: readonly SelectOption[];
  onChange: (next: Record<string, unknown>[], meta?: FormChangeMeta) => void;
};
