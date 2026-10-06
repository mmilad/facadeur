import type { DocumentFile } from '@facadeur/core';
import type { OrganisationRole } from './management.js';

export interface ProjectAccess {
  role: OrganisationRole;
  canWrite: boolean;
}

export interface ProjectSnapshot {
  id: string;
  name?: string;
  organisationId?: string;
  organisationName?: string;
  access?: ProjectAccess;
  documents: DocumentFile[];
  design: DocumentFile;
  sources: Record<string, string>;
  hashes: Record<string, string | null>;
  unsavedDocumentIds?: string[];
}

export interface SaveDocumentRequest {
  document: DocumentFile;
  source: string;
  expectedHash: string | null;
}

export interface SaveDocumentResult {
  document: DocumentFile;
  source: string;
  hash: string;
}
