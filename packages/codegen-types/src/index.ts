import type { DocumentFile } from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';

export interface GenerateReactOptions {
  documents: readonly DocumentFile[];
  design?: DesignInput;
  entries?: readonly string[];
}
