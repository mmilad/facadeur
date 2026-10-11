import { DocumentError } from '@facadeur/core';

/** Project boundary failures, with identifying metadata rather than document contents. */
export function logProjectFailure(error: unknown, projectId?: string) {
  const details = {
    phase: 'load',
    projectId,
    errorType: error instanceof Error ? error.name : typeof error,
    code: error instanceof DocumentError ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  const headline = `[facadeur:project] ${details.message}`;
  console.error(headline, details);
}
