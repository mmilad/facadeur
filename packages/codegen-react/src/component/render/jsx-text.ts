import { quote } from '../../names.js';

export function isJsxName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(name);
}

export function jsxText(value: string): string {
  if (value === '') return '{``}';
  if (/[{}<>&]/.test(value) || /^\s|\s$/.test(value) || value.includes('\n')) {
    return `{${quote(value)}}`;
  }
  return value;
}
