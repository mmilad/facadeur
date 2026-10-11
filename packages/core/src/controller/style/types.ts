import type { DesignTokenFamily } from '@facadeur/domain';
import type { Breakpoint } from '../../schema/document';
import type { TokenDefinition } from './tokens/types';

export type GlobalTokenCommand =
  | { type: 'setToken'; family: DesignTokenFamily; token: TokenDefinition }
  | { type: 'removeToken'; family: DesignTokenFamily; uuid: string };

export type DesignLibraryCommand = { type: 'setBreakpoints'; breakpoints: Breakpoint[] };
