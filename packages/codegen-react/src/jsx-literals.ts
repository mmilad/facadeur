import type { FieldValue } from '@facadeur/core';
import { quote } from './names.js';

export function jsLiteral(value: FieldValue): string {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(value);
  return value ? 'true' : 'false';
}

export function jsxText(value: string): string {
  if (value === '') return '{``}';
  if (/[{}<>&]/.test(value) || /^\s|\s$/.test(value) || value.includes('\n')) {
    return `{${quote(value)}}`;
  }
  return value;
}
