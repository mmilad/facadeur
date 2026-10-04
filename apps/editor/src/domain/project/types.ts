import type { DocumentFile } from '@facadeur/core';

export interface ProjectSnapshot {
  id: string;
  documents: DocumentFile[];
  design: DocumentFile;
  sources: Record<string, string>;
  hashes: Record<string, string | null>;
  unsavedDocumentIds?: string[];
}
