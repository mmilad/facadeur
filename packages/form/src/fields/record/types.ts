import type { AutocompleteOption } from '../autocomplete/types';

export type RecordFieldSuggestions = {
  keys?: readonly string[];
  valuesByKey?: Readonly<Record<string, readonly string[]>>;
  options?: readonly AutocompleteOption[];
};

export type RecordFieldConfig = {
  name: string;
  label: string;
  type: 'record';
  keyLabel?: string;
  valueLabel?: string;
  bindable?: boolean;
  suggestions?: RecordFieldSuggestions;
  disabled?: boolean;
};

export type RecordFieldProps = Omit<RecordFieldConfig, 'type'> & {
  id: string;
  value: Record<string, string>;
  bindOptions?: readonly AutocompleteOption[];
  suggestions?: RecordFieldSuggestions;
  onChange: (next: Record<string, string>) => void;
};
