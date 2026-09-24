export const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
export const TAG_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Stable id safe for `data-id` and the document schema. */
export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let body = '';
  for (const byte of bytes) {
    body += ID_ALPHABET[byte % ID_ALPHABET.length] ?? 'x';
  }
  return `n_${body}`;
}

export function assertId(id: string): void {
  if (!ID_PATTERN.test(id)) {
    throw new Error(`Invalid id "${id}"`);
  }
}
