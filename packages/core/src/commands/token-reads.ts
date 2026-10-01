import { collectTokenRefs } from '../styles/style-block.js';
import type { FlatDocument } from '../document/flat.js';

/** Token references a command introduces must be listed in `tokenInterface.reads`. */
export function adoptTokenReads(doc: FlatDocument): void {
  const reads = new Set(doc.tokenInterface?.reads ?? []);
  let changed = false;
  for (const ref of collectTokenRefs(doc)) {
    if (reads.has(ref)) continue;
    reads.add(ref);
    changed = true;
  }
  if (!changed) return;
  doc.tokenInterface = {
    ...(doc.tokenInterface ?? {}),
    reads: [...reads].sort(),
  };
}
