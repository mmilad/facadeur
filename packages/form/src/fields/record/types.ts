import type { SelectOption } from '../select';

export type RecordFieldConfig = {
  name: string;
  label: string;
  type: 'record';
  keyLabel?: string;
  valueLabel?: string;
  bindable?: boolean;
  disabled?: boolean;
};

export type RecordFieldProps = Omit<RecordFieldConfig, 'type'> & {
  id: string;
  value: Record<string, string>;
  bindOptions?: readonly SelectOption[];
  onChange: (next: Record<string, string>) => void;
};
