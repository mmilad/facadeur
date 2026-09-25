import type { VariantAxis } from '@facadeur/core';
import { variantAxisFromDraft } from '../../../definitions.js';

export function variantValuesText(axis: VariantAxis): string {
  return axis.values.join(', ');
}

export function variantAxisFromValuesText(axis: VariantAxis, valuesText: string): VariantAxis {
  const fallback =
    axis.default && valuesText.split(',').some((part) => part.trim() === axis.default)
      ? axis.default
      : undefined;
  return variantAxisFromDraft({ name: axis.name, valuesText, fallback });
}

export function variantAxisWithDefault(axis: VariantAxis, defaultValue: string): VariantAxis {
  const axisNext: VariantAxis = {
    name: axis.name,
    values: [...axis.values],
    ...(defaultValue ? { default: defaultValue } : {}),
  };
  return axisNext;
}
