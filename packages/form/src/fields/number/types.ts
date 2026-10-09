export type NumberFieldConfig = {
  name: string;
  label: string;
  type: 'number';
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type NumberFieldProps = Omit<NumberFieldConfig, 'label' | 'type'> & {
  id: string;
  value: number | '';
  onChange: (next: number | '') => void;
};
