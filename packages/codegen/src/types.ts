import type { DocumentFile, SchemaCatalog } from '@facadeur/core';
import type { DesignInput } from '@facadeur/core';

/** @deprecated Legacy v1 DocumentFile input; replace with catalog-driven project generation. */
export interface GenerateOptions {
  documents: readonly DocumentFile[];
  design?: DesignInput;
  /** Component JSON Schemas from the project design catalog. */
  schemaCatalog?: SchemaCatalog;
  entries?: readonly string[];
  engine?: 'react';
}

/** @deprecated Legacy v1 generator options. */
export type GenerateReactOptions = Omit<GenerateOptions, 'engine'>;
