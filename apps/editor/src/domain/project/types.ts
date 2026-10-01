import type { DocumentFile } from '@facadeur/core';

export interface ProjectState {
  update: string;
  revision: number;
  savedRevision: number;
}

export interface ProjectSnapshot {
  id: string;
  documents: DocumentFile[];
  design: DocumentFile;
  sources: Record<string, string>;
  states: Record<string, ProjectState>;
}
