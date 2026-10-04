import type { DocumentFile, SchemaCatalog } from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';

export interface GenerateOptions {
  documents: readonly DocumentFile[];
  design?: DesignInput;
  /** Component JSON Schemas from the project design catalog. */
  schemaCatalog?: SchemaCatalog;
  entries?: readonly string[];
  engine?: 'react';
}

export type GenerateReactOptions = Omit<GenerateOptions, 'engine'>;
