import type { AutocompleteOption } from '../autocomplete/types';

export type TransformableFieldOption =
  | { type: 'text'; label: string }
  | { type: 'color'; label: string }
  | { type: 'prop' | 'token'; label: string; items: readonly AutocompleteOption[] }
  | { type: 'set'; label: string; items: readonly TransformableFieldOption[] };

export type TransformableFieldConfig = {
  name: string;
  label: string;
  type: 'transformable';
  fieldOptions: readonly TransformableFieldOption[];
  placeholder?: string;
  disabled?: boolean;
};

export type TransformableFieldProps = Omit<TransformableFieldConfig, 'type'> & {
  id: string;
  value: string;
  onChange: (next: string) => void;
  onTransform?: (type: Exclude<TransformableFieldOption['type'], 'set'>) => void;
};

export type TransformableValueFieldConfig = Pick<
  TransformableFieldConfig,
  'type' | 'fieldOptions' | 'placeholder'
>;
