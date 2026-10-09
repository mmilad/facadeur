export type TextFieldConfig = {
  name: string;
  label: string;
  type: 'text';
  placeholder?: string;
  disabled?: boolean;
};

export type TextFieldProps = {
  id: string;
  name: string;
  label?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  suggestions?: readonly { value: string; label?: string }[];
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
};
