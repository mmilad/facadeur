export type SelectOption = {
  value: string;
  label: string;
};

export type SelectFieldConfig = {
  name: string;
  label: string;
  type: 'select';
  options?: readonly SelectOption[];
  optionsFrom?: {
    arg: string;
    values: Readonly<Record<string, readonly SelectOption[]>>;
  };
  disabled?: boolean;
};

export type SelectFieldProps = Omit<SelectFieldConfig, 'label' | 'type' | 'optionsFrom'> & {
  id: string;
  options: readonly SelectOption[];
  value: string;
  onChange: (next: string) => void;
};
