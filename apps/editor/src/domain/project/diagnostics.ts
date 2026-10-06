import {
  DocumentError,
  type DocumentFile,
  type FlatDocument,
  type SchemaCatalog,
} from '@facadeur/core';

export type ProjectFailureContext = {
  phase: 'load' | 'connect' | 'command' | 'save';
  projectId?: string;
  document?: DocumentFile | FlatDocument;
  schemaCatalog?: SchemaCatalog;
  source?: 'json';
  command?: string;
};

/** Project boundary failures, with identifying metadata rather than document contents. */
export function logProjectFailure(error: unknown, context: ProjectFailureContext) {
  const details = {
    phase: context.phase,
    projectId: context.projectId,
    documentId: context.document?.id,
    schemaUse: context.document?.schemaUse,
    schemaIds: context.schemaCatalog?.schemas.map((schema) => schema.id),
    source: context.source,
    command: context.command,
    errorType: error instanceof Error ? error.name : typeof error,
    code: error instanceof DocumentError ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  const headline = `[facadeur:project] ${details.message}`;
  console.error(headline, details);
}
