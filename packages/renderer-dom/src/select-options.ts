import type { Binding, FieldValue } from '@facadeur/core';

/** Native options are control data, not editable child layers of an atom. */
export function syncSelectOptions(
  element: HTMLElement,
  bindings: Binding[] | undefined,
  scope: Record<string, FieldValue>,
) {
  if (element.tagName.toLowerCase() !== 'select') return;
  const binding = bindings?.find((binding) => binding.target === 'options');
  if (!binding) return;
  const select = element as HTMLSelectElement;
  const values = scope[binding.field];
  const options = Array.isArray(values)
    ? values.flatMap((value) => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          typeof value.value !== 'string' ||
          typeof value.label !== 'string'
        )
          return [];
        return [{ value: value.value, label: value.label, disabled: value.disabled === true }];
      })
    : [];
  if (
    select.options.length !== options.length ||
    options.some((option, index) => {
      const current = select.options[index];
      return (
        current?.value !== option.value ||
        current.textContent !== option.label ||
        current.disabled !== option.disabled
      );
    })
  ) {
    select.replaceChildren(
      ...options.map((option) => {
        const element = select.ownerDocument.createElement('option');
        element.value = option.value;
        element.textContent = option.label;
        element.disabled = option.disabled;
        return element;
      }),
    );
  }
  const value = select.getAttribute('value');
  if (value !== null) select.value = value;
}
