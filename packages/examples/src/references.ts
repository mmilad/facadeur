import type { DesignTokenUuid } from '@facadeur/domain';

/** Example fixtures keep property references readable and tie them to schema IDs. */
export function componentPropRef(uuid: string): string {
  return `{props:${uuid}}`;
}

/** Build a token reference from the single token UUID source. */
export function tokenRef(uuid: DesignTokenUuid): string {
  return `{token:${uuid}}`;
}
