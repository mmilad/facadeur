export type AutocompleteOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
  keywords?: string;
};

export type AutocompleteSelectFieldProps = {
  id: string;
  name?: string;
  label?: string;
  value: string;
  options: readonly AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  onClear?: () => void;
};
