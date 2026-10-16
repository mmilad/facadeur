import type { DesignTokenFamily } from '@facadeur/domain';
import type { Breakpoint } from '../../schema/document';
import type { TokenDefinition } from './tokens/types';
import type { ClassCondition } from '@facadeur/domain';

export type GlobalTokenCommand =
  | { type: 'setToken'; family: DesignTokenFamily; token: TokenDefinition }
  | { type: 'removeToken'; family: DesignTokenFamily; uuid: string };

export type DesignLibraryCommand = { type: 'setBreakpoints'; breakpoints: Breakpoint[] };

export type NodeClassStyleCommand = {
  type: 'setNodeClassStyleDeclaration';
  nodeUuid: string;
  definitionUuid: string;
  className: string;
  property: string;
  value: string | null;
  breakpointUuid: string | null;
};

export type NodeClassStyleDeclarationsCommand = {
  type: 'setNodeClassStyleDeclarations';
  nodeUuid: string;
  definitionUuid: string;
  className: string;
  declarations: Readonly<Record<string, string | null>>;
  breakpointUuid: string | null;
};

export type NodeClassConditionCommand = {
  type: 'setNodeClassCondition';
  nodeUuid: string;
  definitionUuid: string;
  className: string;
  condition: ClassCondition | null;
};
