import { describe, expect, it } from 'vitest';
import { encodePropRef, parsePropRef } from '../src/controller/project/node/preview/prop-ref';

describe('prop ref', () => {
  it('round-trips design prop bindings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440099';
    const ref = encodePropRef(uuid);
    expect(ref).toBe(`{prop:${uuid}}`);
    expect(parsePropRef(ref)).toBe(uuid);
  });
});
