import { describe, expect, it } from 'vitest';
import { formatKey, getPath, parsePath, setPath } from '../../src/ui/form/schema/path.js';

describe('form path helpers', () => {
  it('reads and writes nested paths with array indices', () => {
    const root = { fields: [{ name: 'a' }, { name: 'b' }] };
    expect(getPath(root, 'fields.1.name')).toBe('b');
    const next = setPath(root, 'fields.1.name', 'c');
    expect(getPath(next, 'fields.1.name')).toBe('c');
    expect(getPath(root, 'fields.1.name')).toBe('b');
  });

  it('supports bracket-escaped record keys', () => {
    const root = { declarations: { 'padding.top': '4px' } };
    const path = `declarations${formatKey('padding.top')}`;
    expect(parsePath(path)).toEqual(['declarations', 'padding.top']);
    expect(getPath(root, path)).toBe('4px');
    const next = setPath(root, path, '8px');
    expect(getPath(next, path)).toBe('8px');
  });
});
