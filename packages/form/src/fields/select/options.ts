import type { ComboboxFieldConfig } from '../combobox';
import type { SelectFieldConfig, SelectOption } from './types';

type OptionFieldConfig = SelectFieldConfig | ComboboxFieldConfig;

export function getSelectOptions(
  field: OptionFieldConfig,
  value: Readonly<Record<string, unknown>>,
): readonly SelectOption[] {
  if (!field.optionsFrom) return field.options ?? [];
  return field.optionsFrom.values[String(value[field.optionsFrom.arg])] ?? field.options ?? [];
}
