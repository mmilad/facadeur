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
  rows?: number;
  onChange: (next: string) => void;
};
