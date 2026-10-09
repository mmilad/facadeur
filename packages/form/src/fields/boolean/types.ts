export type BooleanFieldConfig = {
  name: string;
  label: string;
  type: 'boolean';
  disabled?: boolean;
};

export type BooleanFieldProps = Omit<BooleanFieldConfig, 'label' | 'type'> & {
  id: string;
  value: boolean;
  onChange: (next: boolean) => void;
};
