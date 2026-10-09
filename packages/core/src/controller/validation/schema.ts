import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { DocumentError } from '../../document/errors';
import {
  createDocumentSchema,
  documentFileSchema,
  type DocumentFile,
  type DocumentSchemaOptions,
} from '../../schema/document';
import {
  hasLegacyReferenceLocations,
  migrateLegacyDesignLibraries,
  migrateLegacyReferenceLocations,
} from '../style/tokens/global/legacy-migration';
import { isPlainObject } from '../../utils';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateFile: ValidateFunction = ajv.compile(documentFileSchema);

/**
 * @deprecated Flat `DocumentFile` JSON. Prefer {@link validateProjectCatalog} for project data; remove with the document-file editor path.
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
  if (!hasLegacy && !hasLegacyReferenceLocations(data, migration.tokenIds, migration.breakpointIds)) {
    return data;
  }

  const next = migrateLegacyReferenceLocations(data, migration.tokenIds, migration.breakpointIds) as Record<string, unknown>;
  delete next.fonts;
  if (migration.tokens) next.tokens = migration.tokens;
  if (migration.breakpoints && settings) next.settings = { ...settings, breakpoints: migration.breakpoints };
  return next;
}

/**
 * @deprecated Flat document Ajv validator. Remove with {@link validateDocumentFile} and the document-file editor path.
 */
export function compileDocumentValidator(options: DocumentSchemaOptions = {}): ValidateFunction {
  return new Ajv({ allErrors: true, strict: false }).compile(createDocumentSchema(options));
}

function formatErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors?.length) return 'Document does not match the schema';
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`.trim())
    .join('; ');
}
