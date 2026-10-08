import type { DocumentFile, ProjectCatalogModel } from '@facadeur/core';
import type { OrganisationRole } from './management';

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
  catalog: ProjectCatalogModel;
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
