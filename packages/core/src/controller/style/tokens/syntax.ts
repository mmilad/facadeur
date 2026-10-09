import type { DesignTokenReference } from '@facadeur/domain';
import { UUID_PATTERN } from '../../../document/ids';

/** Whole-string token reference, keyed by stable UUID. */
const UUID_SOURCE = UUID_PATTERN.source.slice(1, -1);
const REFERENCE = new RegExp(`^\\{token:(${UUID_SOURCE})\\}$`, 'i');

export function tokenReference(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return REFERENCE.exec(value)?.[1];
}

export function tokenReferenceValue(uuid: string): DesignTokenReference {
  return `{token:${uuid}}`;
}

/** Retained for DTCG import validation only. */
export const TOKEN_SEGMENT = /^[a-z0-9]+$/;
