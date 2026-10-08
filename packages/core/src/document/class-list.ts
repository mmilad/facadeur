import { DocumentError } from './errors';

export function classList(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string' && /^\S+$/.test(item))
  ) {
    throw new DocumentError(
      'schema',
      'Classes must be an array of non-empty tokens without whitespace',
    );
  }
  return [...new Set(value)];
}
