import type { SelectOption } from '../select';

export type SegmentedControlFieldProps = {
  id: string;
  label?: string;
  value: string;
  options: readonly SelectOption[];
  disabled?: boolean;
  invalid?: boolean;
  onChange: (next: string) => void;
};
