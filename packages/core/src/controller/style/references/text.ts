import { UUID_PATTERN } from '../../../document/ids';

const UUID_SOURCE = UUID_PATTERN.source.slice(1, -1);
const TOKEN_REF = new RegExp(`\\{token:(${UUID_SOURCE})\\}`, 'gi');

/** Collect UUIDs from canonical `{token:uuid}` references embedded in CSS values. */
export function refsInText(value: string): string[] {
  const refs: string[] = [];
  for (const match of value.matchAll(TOKEN_REF)) {
    const uuid = match[1];
    if (uuid) refs.push(uuid);
  }
  return refs;
}
