export type ClassListFieldConfig = {
  name: string;
  label: string;
  type: 'classList';
  suggestions?: readonly string[];
  disabled?: boolean;
};

export type ClassListFieldProps = Omit<ClassListFieldConfig, 'type' | 'suggestions'> & {
  id: string;
  value: readonly string[];
  suggestions?: readonly string[];
  onChange: (next: string[]) => void;
};
