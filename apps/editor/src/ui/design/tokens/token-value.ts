import type { DesignTokenValue } from '@facadeur/core';

export function isTokenRecord(value: unknown): value is Readonly<Record<string, DesignTokenValue>> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
