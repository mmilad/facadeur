import type { AutocompleteOption } from '../autocomplete/types';
import type { TransformableValueFieldConfig } from '../transformable';

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
  valueField?: TransformableValueFieldConfig;
  suggestions?: RecordFieldSuggestions;
  disabled?: boolean;
};

export type RecordFieldProps = Omit<RecordFieldConfig, 'type'> & {
  id: string;
  value: Record<string, string>;
  suggestions?: RecordFieldSuggestions;
  onChange: (next: Record<string, string>) => void;
};
