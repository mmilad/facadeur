export type ChipsFieldConfig = {
  name: string;
  label: string;
  type: 'chips';
  suggestions?: readonly string[];
  placeholder?: string;
  disabled?: boolean;
};

export type ChipsFieldProps = Omit<ChipsFieldConfig, 'label' | 'type'> & {
  id: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
};
