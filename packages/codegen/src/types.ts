import type { DocumentFile } from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';

export interface GenerateOptions {
  documents: readonly DocumentFile[];
  design?: DesignInput;
  entries?: readonly string[];
  engine?: 'react';
}

export type GenerateReactOptions = Omit<GenerateOptions, 'engine'>;
