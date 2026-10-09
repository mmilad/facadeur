import { tokenReference } from '@facadeur/core';

/** Token ids stay unchanged; only their author-facing presentation is normalized. */
const namespaces = new Set(['color', 'space', 'radius', 'shadow', 'type', 'font']);

export function tokenPath(reference: string): string {
  const value = reference.trim();
  if (tokenReference(value)) return '';
  return /^\{[^{}]+\}$/.test(value) ? value.slice(1, -1) : value;
}

export function tokenSegmentLabel(segment: string): string {
  return segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment;
}

export function tokenLeafLabel(path: string): string {
  return tokenSegmentLabel(tokenPath(path).split('.').at(-1) ?? path);
}

export function tokenTitle(path: string): string {
  const parts = tokenPath(path).split('.').filter(Boolean);
  if (parts.length > 1 && namespaces.has(parts[0]!)) parts.shift();
  return parts.map(tokenSegmentLabel).join(' ');
}

export function tokenDisplayLabel(reference: string, label?: string): string {
  const path = tokenPath(reference);
  const parts = path.split('.');
  const savedLabel = label?.trim();
  if (savedLabel) return savedLabel;
  const uuid = tokenReference(reference);
  if (uuid) return `Token ${uuid.slice(0, 8)}`;

  const leaf = tokenLeafLabel(path);
  const group = parts.length > 1 ? tokenTitle(parts.slice(0, -1).join('.')) : '';
  // A namespace alone is not a useful group name (color.brand => Brand).
  const prefix = parts.length === 2 && namespaces.has(parts[0]!) ? '' : group;
  return [prefix, leaf].filter(Boolean).join(' ');
}
