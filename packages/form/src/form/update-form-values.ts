import { getSelectOptions } from '../fields/select';
import type { FormFieldConfig } from '../field';

export function updateFormValues<T extends Record<string, unknown>>(
  value: T,
  fields: readonly FormFieldConfig[],
  changedName: string,
  nextValue: unknown,
) {
  const next: Record<string, unknown> = { ...value, [changedName]: nextValue };

  for (const field of flattenLayoutFields(fields)) {
    if (
      (field.type !== 'select' && field.type !== 'combobox') ||
      field.optionsFrom?.arg !== changedName
    )
      continue;
    const options = getSelectOptions(field, next);
    const current = next[field.name];
    if (typeof current === 'string' && options.some((option) => option.value === current)) continue;
    next[field.name] = options[0]?.value ?? '';
  }

  return next as T;
}

function flattenLayoutFields(fields: readonly FormFieldConfig[]): FormFieldConfig[] {
  return fields.flatMap((field) =>
    field.type === 'layout' ? flattenLayoutFields(field.fields) : [field],
  );
}
