import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { DocumentError } from '../../document/errors.js';
import {
  createDocumentSchema,
  documentFileSchema,
  type DocumentFile,
  type DocumentSchemaOptions,
} from '../../schema/document.js';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateFile: ValidateFunction = ajv.compile(documentFileSchema);

export function validateDocumentFile(data: unknown): DocumentFile {
  if (!validateFile(data)) {
    throw new DocumentError('schema', formatErrors(validateFile.errors));
  }
  return data as DocumentFile;
}

export function compileDocumentValidator(options: DocumentSchemaOptions = {}): ValidateFunction {
  return new Ajv({ allErrors: true, strict: false }).compile(createDocumentSchema(options));
}

function formatErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors?.length) return 'Document does not match the schema';
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`.trim())
    .join('; ');
}
