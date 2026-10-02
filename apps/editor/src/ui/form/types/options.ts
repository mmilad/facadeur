export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  description?: string;
  keywords?: string;
};

/** Case-insensitive, whitespace-separated terms can match across name, id and value. */
export function matchesSearch(query: string, ...fields: (string | undefined)[]): boolean {
  const text = fields.filter(Boolean).join(' ').toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => text.includes(term));
}
