import { readJsonObject } from './codec-shared';
import * as Y from 'yjs';

/** Read the old font-family map only so the store can migrate it into font tokens. */
export function readLegacyFonts(fonts: Y.Map<unknown>): unknown[] {
  const order = fonts.get('$order');
  if (!(order instanceof Y.Array)) return [];
  return order.toArray().flatMap((key) => {
    if (typeof key !== 'string') return [];
    const value = fonts.get(key);
    if (!(value instanceof Y.Map)) return [];
    return [{ ...readJsonObject(value), id: key }];
  });
}

/** Preserve old `id` breakpoint rows for the one-time design-library importer. */
export function readLegacyBreakpoints(settings: Y.Map<unknown>): unknown[] | undefined {
  const value = settings.get('breakpoints');
  if (!(value instanceof Y.Array)) return undefined;
  const rows = value.toArray().flatMap((item) => {
    if (!(item instanceof Y.Map)) return [];
    const minWidth = item.get('minWidth');
    if (typeof minWidth !== 'number') return [];
    const row: Record<string, unknown> = { minWidth };
    const uuid = item.get('uuid');
    const id = item.get('id');
    const label = item.get('label');
    const enabled = item.get('enabled');
    if (typeof uuid === 'string') row.uuid = uuid;
    if (typeof id === 'string') row.id = id;
    if (typeof label === 'string') row.label = label;
    if (enabled === false) row.enabled = false;
    return [row];
  });
  return rows.length ? rows : undefined;
}
