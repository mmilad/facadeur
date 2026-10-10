import Ajv from 'ajv';

/** Core's schemas validate UUIDs through their pattern; keep `format` annotation-only. */
export function createAjv() {
  return new Ajv({ allErrors: true, strict: false, formats: { uuid: true } });
}
