import type { TextFieldConfig } from '../fields/text';
import type { TextAreaFieldConfig } from '../fields/textarea';
import type { NumberFieldConfig } from '../fields/number';
import type { BooleanFieldConfig } from '../fields/boolean';
import type { SelectFieldConfig } from '../fields/select';
import type { ObjectFieldConfig } from '../fields/object';
import type { RepeaterFieldConfig } from '../fields/repeater';
import type { FormChangeMeta } from '../form/types';
import type { ColorFieldConfig } from '../fields/color';
import type { SearchFieldConfig } from '../fields/search';
import type { ComboboxFieldConfig } from '../fields/combobox';
import type { LayoutFieldConfig } from '../fields/layout';
import type { ChipsFieldConfig } from '../fields/chips';
import type { RecordFieldConfig } from '../fields/record';
import type { TransformableFieldConfig } from '../fields/transformable';
import type { AutocompleteOption } from '../fields/autocomplete/types';

export type FormFieldConfig =
  | TextFieldConfig
  | TextAreaFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | SelectFieldConfig
  | ComboboxFieldConfig
  | ColorFieldConfig
  | SearchFieldConfig
  | ObjectFieldConfig
  | RepeaterFieldConfig
  | LayoutFieldConfig
  | ChipsFieldConfig
  | RecordFieldConfig
  | TransformableFieldConfig;

export type ValueFormFieldConfig = Exclude<FormFieldConfig, LayoutFieldConfig>;

export type FormFieldProps = {
  field: ValueFormFieldConfig;
  id: string;
  layout: 'stacked' | 'horizontal';
  value: unknown;
  values: Readonly<Record<string, unknown>>;
  bindOptions: readonly AutocompleteOption[];
  onChange: (next: unknown, meta?: FormChangeMeta) => void;
};
