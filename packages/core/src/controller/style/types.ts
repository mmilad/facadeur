import type { DesignTokenFamily } from '@facadeur/domain';
import type { Breakpoint } from '../../schema/document';
import type { TokenDefinition } from './tokens/types';

export type GlobalTokenCommand =
  | { type: 'setToken'; family: DesignTokenFamily; token: TokenDefinition }
  | { type: 'removeToken'; family: DesignTokenFamily; uuid: string };

export type DesignLibraryCommand = { type: 'setBreakpoints'; breakpoints: Breakpoint[] };

export type LayerStyleCommand = {
  type: 'setLayerStyleDeclaration';
  nodeUuid: string;
  property: string;
  value: string | null;
  breakpointUuid: string | null;
};
