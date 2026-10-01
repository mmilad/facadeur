import type { DefaultKind, FlatDocument, VariantPreset } from '@facadeur/core';

/** Display metadata is intentionally separate from the stable preset name. */
export type VariantLabelDocument = Pick<FlatDocument, 'variantPresets'> & {
  variantLabels?: Readonly<Record<string, string>>;
};

export interface VariantSummary {
  name: string;
  label: string;
  isDefault: boolean;
}

export const variantOwnerKinds: readonly DefaultKind[] = ['atom', 'component'];

export function ownsVariantContract(kind: string): boolean {
  return kind === 'atom' || kind === 'component';
}

export function variantSummaries(document: VariantLabelDocument): VariantSummary[] {
  const names = [
    'default',
    ...(document.variantPresets ?? [])
      .map((preset) => preset.name)
      .filter((name) => name !== 'default'),
  ];
  return names.map((name) => ({
    name,
    label: variantLabel(document, name),
    isDefault: name === 'default',
  }));
}

export function variantLabel(document: VariantLabelDocument, name: string): string {
  const stored = document.variantLabels?.[name]?.trim();
  if (stored) return stored;
  return name === 'default' ? 'Default' : name;
}

export function variantLabelMap(
  document: VariantLabelDocument,
  name: string,
  label: string,
): Record<string, string> | undefined {
  const next = { ...(document.variantLabels ?? {}) };
  const trimmed = label.trim();
  if (trimmed) next[name] = trimmed;
  else delete next[name];
  return Object.keys(next).length ? next : undefined;
}

/** Generate a stable internal name and the initial German display label. */
export function nextVariantIdentity(document: VariantLabelDocument): {
  name: string;
  label: string;
  preset: VariantPreset;
} {
  const taken = new Set((document.variantPresets ?? []).map((preset) => preset.name));
  let index = 1;
  while (taken.has(`variant-${index}`)) index += 1;
  return {
    name: `variant-${index}`,
    label: `Variante ${index}`,
    preset: { name: `variant-${index}` },
  };
}
