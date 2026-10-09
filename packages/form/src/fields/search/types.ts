export type SearchFieldConfig = {
  name: string;
  label: string;
  type: 'search';
  placeholder?: string;
  disabled?: boolean;
};

export type SearchFieldProps = Omit<SearchFieldConfig, 'label' | 'type'> & {
  id: string;
  value: string;
  className?: string;
  onChange: (next: string) => void;
};
