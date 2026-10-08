import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { DocumentError } from '../../document/errors';
import {
  createDocumentSchema,
  documentFileSchema,
  type DocumentFile,
  type DocumentSchemaOptions,
} from '../../schema/document';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateFile: ValidateFunction = ajv.compile(documentFileSchema);

/**
 * @deprecated Flat `DocumentFile` JSON. Prefer {@link validateProjectCatalog} for project data; remove with the document-file editor path.
 */
export function validateDocumentFile(data: unknown): DocumentFile {
  if (!validateFile(data)) {
    throw new DocumentError('schema', formatErrors(validateFile.errors));
  }
  return data as DocumentFile;
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
