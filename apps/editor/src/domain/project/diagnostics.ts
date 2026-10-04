import {
  DocumentError,
  type DocumentFile,
  type FlatDocument,
  type SchemaCatalog,
} from '@facadeur/core';

/** Project boundary failures, with identifying metadata rather than document contents. */
export function logProjectFailure(
  error: unknown,
  context: {
    phase: 'load' | 'connect' | 'command' | 'save';
    document?: DocumentFile | FlatDocument;
    schemaCatalog?: SchemaCatalog;
    source?: 'json';
    command?: string;
  },
) {
  console.error('[facadeur:project]', {
    phase: context.phase,
    documentId: context.document?.id,
    schemaUse: context.document?.schemaUse,
    schemaIds: context.schemaCatalog?.schemas.map((schema) => schema.id),
    source: context.source,
    command: context.command,
    errorType: error instanceof Error ? error.name : typeof error,
    code: error instanceof DocumentError ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
