export type TextAreaFieldConfig = {
  name: string;
  label: string;
  type: 'textarea';
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
};

export type TextAreaProps = {
  id: string;
  name: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  rows?: number;
  onCommit?: (next: string) => void;
  onChange: (next: string) => void;
};
