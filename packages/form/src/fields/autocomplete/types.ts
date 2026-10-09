export type AutocompleteOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
  /** Show the option label in place of its stored reference in the closed control. */
  displayLabel?: boolean;
};

export type AutocompleteFieldProps = {
  id: string;
  name?: string;
  label?: string;
  value: string;
  options: readonly AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: string) => void;
};
