import { tokenReference } from '@facadeur/core';

/** Token ids stay unchanged; only their author-facing presentation is normalized. */
const namespaces = new Set(['color', 'space', 'radius', 'shadow', 'type', 'font']);
const familyLabels: Record<string, string> = {
  color: 'Colors',
  space: 'Spacing',
  radius: 'Radius',
  shadow: 'Shadow',
  type: 'Typography',
  font: 'Fonts',
};

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
  const parts = path.split('.').filter(Boolean);
  const savedLabel = label?.trim();
  const uuid = tokenReference(reference);
  if (uuid) return `Token ${uuid.slice(0, 8)}`;
  const family = parts.shift();
  const name = savedLabel || tokenSegmentLabel(parts.pop() ?? '');
  const familyLabel = family ? (familyLabels[family] ?? tokenSegmentLabel(family)) : '';
  const group = parts.map(tokenSegmentLabel);
  return [familyLabel, ...group, name].filter(Boolean).join(' / ');
}
