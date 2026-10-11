import { previewDesignTokenCssVar } from '@facadeur/style-engine';
import { matchesSearch } from './token-search';

export interface TokenTableItem {
  path: string;
  valueText: string;
  label?: string;
}

export function naturalTokenCompare(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export function tokenMatchesQuery(item: TokenTableItem, query: string): boolean {
  return matchesSearch(
    query,
    item.path,
    item.label,
    item.valueText,
    previewDesignTokenCssVar(item.path),
  );
}
