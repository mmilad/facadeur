export type TextFieldConfig = {
  name: string;
  label: string;
  type: 'text';
  placeholder?: string;
  disabled?: boolean;
  bindable?: boolean;
};

export type TextFieldProps = {
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: string) => void;
};
