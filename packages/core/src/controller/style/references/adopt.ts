import {
  globalRefInComponentTokenDefault,
  isLocalComponentTokenPath,
} from '../tokens/component/contract.js';
import { collectTokenRefs } from './collect.js';
import type { FlatDocument } from '../../../document/flat.js';

/** Token references a command introduces must be listed in `tokenInterface.reads`. */
export function adoptTokenReads(doc: FlatDocument) {
  const reads = new Set(doc.tokenInterface?.reads ?? []);
  let changed = false;
  for (const ref of collectTokenRefs(doc)) {
    if (isLocalComponentTokenPath(doc, ref)) continue;
    if (reads.has(ref)) continue;
    reads.add(ref);
    changed = true;
  }
  for (const token of Object.values(doc.componentTokens ?? {})) {
    const globalRef = globalRefInComponentTokenDefault(token.value);
    if (!globalRef || reads.has(globalRef)) continue;
    reads.add(globalRef);
    changed = true;
  }
  if (!changed) return;
  doc.tokenInterface = {
    ...(doc.tokenInterface ?? {}),
    reads: [...reads].sort(),
  };
}
