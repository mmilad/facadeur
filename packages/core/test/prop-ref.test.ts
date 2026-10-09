import { describe, expect, it } from 'vitest';
import { encodePropRef, parsePropRef } from '../src/controller/project/node/preview/prop-ref';
const testUuid28 = globalThis.crypto.randomUUID();

describe('prop ref', () => {
  it('round-trips design prop bindings', () => {
    const uuid = testUuid28;
    const ref = encodePropRef(uuid);
    expect(ref).toBe(`{prop:${uuid}}`);
    expect(parsePropRef(ref)).toBe(uuid);
  });
});
