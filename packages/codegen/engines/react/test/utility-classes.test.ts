import { describe, expect, it } from 'vitest';
import { generateReact } from '../src/index';
import type { DocumentFile } from '@facadeur/core';

describe('utility class output', () => {
  it('emits literal utility tokens on native roots and component instances beside scoped styles', () => {
    const action: DocumentFile = {
      version: 1,
      id: 'action',
      name: 'Action',
      kind: 'atom',
      root: {
        id: 'root',
        type: 'frame',
        tag: 'button',
        classes: ['hover:bg-blue-600'],
        style: { color: 'red' },
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        classes: ['flex'],
        children: [
          { id: 'action', type: 'instance', component: 'action', classes: ['w-[calc(100%-2rem)]'] },
        ],
      },
    };
    const files = generateReact({ documents: [action, host] }).ui;
    const components = files
      .filter((file) => file.path.endsWith('component.tsx'))
      .map((file) => file.contents)
      .join('\n');
    expect(components).toContain('hover:bg-blue-600');
    expect(components).toContain('w-[calc(100%-2rem)]');
    expect(components).toContain("'flex'");
    expect(components).toContain('styles["root"]');
    expect(
      files.some(
        (file) => file.path.endsWith('style.module.css') && file.contents.includes('color: red'),
      ),
    ).toBe(true);
  });
});
