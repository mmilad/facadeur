import type { SelectOption } from '../select';

export type ComboboxFieldConfig = {
  name: string;
  label: string;
  type: 'combobox';
  options?: readonly SelectOption[];
  optionsFrom?: {
    arg: string;
    values: Readonly<Record<string, readonly SelectOption[]>>;
  };
  disabled?: boolean;
};

export type ComboboxFieldProps = Omit<ComboboxFieldConfig, 'label' | 'type' | 'optionsFrom'> & {
  id: string;
  label?: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (next: string) => void;
};
