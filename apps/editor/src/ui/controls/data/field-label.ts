const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  hasIcon: 'Show leading icon',
  icon: 'Leading icon',
};

export function fieldDisplayLabel(name: string): string {
  const override = FIELD_LABEL_OVERRIDES[name];
  if (override) return override;

  const readable = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return readable ? readable.charAt(0).toUpperCase() + readable.slice(1) : name;
}
