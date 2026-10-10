export type AutocompleteOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: string;
  disabled?: boolean;
};

export type AutocompleteSelectFieldProps = {
  id: string;
  name?: string;
  label?: string;
  value: string;
  selectedLabel?: string;
  options: readonly AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (next: string) => void;
  onClear?: () => void;
};
