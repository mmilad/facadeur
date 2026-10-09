export const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
export const TAG_PATTERN = /^[A-Za-z][A-Za-z0-9-]*$/;
export const UUID_PATTERN = /^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** RFC 4122 uuid for catalog definitions, tree nodes, and shared schemas. */
export function createCatalogUuid(): string {
  return crypto.randomUUID();
}

/** Stable id safe for `data-id` and the document schema. */
export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let body = '';
  for (const byte of bytes) {
    body += ID_ALPHABET[byte % ID_ALPHABET.length] ?? 'x';
  }
  return `n_${body}`;
}
