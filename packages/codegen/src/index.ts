import { generateReact, type GenerateReactOutput } from '../engines/react/src/generate';
import type { GenerateOptions } from './types';

/** @deprecated Legacy v1 DocumentFile generator; use catalog-driven project generation. */
export function generate(options: GenerateOptions): GenerateReactOutput {
  switch (options.engine ?? 'react') {
    case 'react':
      return generateReact(options);
  }
}

/** @deprecated Legacy v1 generator output types. */
export type {
  GeneratedFile,
  GenerateReactOutput as GenerateOutput,
} from '../engines/react/src/generate';
export type { GenerateOptions };
