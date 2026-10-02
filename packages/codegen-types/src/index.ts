import type { DocumentFile } from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';

export type CodegenStyleMode = 'bundle' | 'component-local';

export interface GenerateReactOptions {
  documents: readonly DocumentFile[];
  design?: DesignInput;
  entries?: readonly string[];
  styles?: CodegenStyleMode;
}
