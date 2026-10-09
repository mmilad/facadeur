export type ColorFieldConfig = {
  name: string;
  label: string;
  type: 'color';
  disabled?: boolean;
};

export type ColorFieldProps = Omit<ColorFieldConfig, 'label' | 'type'> & {
  id: string;
  value: string;
  onChange: (next: string) => void;
};
