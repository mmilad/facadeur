import { type ErrorObject, type ValidateFunction } from 'ajv';
import { DocumentError } from '../../../document/errors';
import { createAjv } from '../../../controller/validation/ajv';
import {
  documentFileSchema,
  type DocumentFile,
} from '../../../schema/document';
import {
  hasLegacyReferenceLocations,
  migrateLegacyDesignLibraries,
  migrateLegacyReferenceLocations,
} from '../../../controller/style/tokens/global/legacy-migration';
import { isPlainObject } from '../../../utils';

const ajv = createAjv();
const validateFile: ValidateFunction = ajv.compile(documentFileSchema);

/**
 * @deprecated Legacy `DocumentFile` validation and migration for API, Server, and Store-Yjs
 * adapters. Catalog project data must use `validateProjectCatalog`; remove after those adapters
 * migrate away from the document-file format.
 */
export function validateDocumentFile(data: unknown): DocumentFile {
  const migrated = migrateDocumentDesignLibraries(data);
  if (!validateFile(migrated)) {
    throw new DocumentError('schema', formatErrors(validateFile.errors));
  }
  return migrated as DocumentFile;
}

function migrateDocumentDesignLibraries(data: unknown) {
  if (!isPlainObject(data)) return data;
  const settings = isPlainObject(data.settings) ? data.settings : undefined;
  const migration = migrateLegacyDesignLibraries({
    tokens: data.tokens,
    fonts: data.fonts,
    breakpoints: settings?.breakpoints,
  });
  const hasLegacy =
    'fonts' in data ||
    (migration.tokens !== undefined && migration.tokens !== data.tokens) ||
    migration.breakpoints !== undefined;
  if (
    !hasLegacy &&
    !hasLegacyReferenceLocations(data, migration.tokenIds, migration.breakpointIds)
  ) {
    return data;
  }

  const next = migrateLegacyReferenceLocations(
    data,
    migration.tokenIds,
    migration.breakpointIds,
  ) as Record<string, unknown>;
  delete next.fonts;
  if (migration.tokens) next.tokens = migration.tokens;
  if (migration.breakpoints && settings)
    next.settings = { ...settings, breakpoints: migration.breakpoints };
  return next;
}

function formatErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors?.length) return 'Document does not match the schema';
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`.trim())
    .join('; ');
}
