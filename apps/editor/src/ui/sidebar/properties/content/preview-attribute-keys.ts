/** HTML attributes edited under Content → Preview options (P2-4). */
export const PREVIEW_ATTRIBUTE_KEYS = [
  'readonly',
  'tabindex',
  'disabled',
  'aria-hidden',
  'contenteditable',
] as const;

const previewKeySet = new Set<string>(PREVIEW_ATTRIBUTE_KEYS);

export function isPreviewAttributeKey(key: string): boolean {
  return previewKeySet.has(key) || previewKeySet.has(key.toLowerCase());
}

export function partitionNodeAttributes(attributes: Record<string, string>): {
  main: [string, string][];
  preview: [string, string][];
} {
  const main: [string, string][] = [];
  const preview: [string, string][] = [];
  for (const entry of Object.entries(attributes)) {
    if (isPreviewAttributeKey(entry[0])) preview.push(entry);
    else main.push(entry);
  }
  return { main, preview };
}
