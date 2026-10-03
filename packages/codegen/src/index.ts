import { generateReact, type GenerateReactOutput } from '../engines/react/src/generate';
import type { GenerateOptions } from './types';

export function generate(options: GenerateOptions): GenerateReactOutput {
  switch (options.engine ?? 'react') {
    case 'react':
      return generateReact(options);
  }
}

export type {
  GeneratedFile,
  GenerateReactOutput as GenerateOutput,
} from '../engines/react/src/generate';
export type { GenerateOptions };
