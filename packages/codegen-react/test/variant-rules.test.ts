import { describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { generateReact } from '../src/index.js';

function source(files: ReturnType<typeof generateReact>['ui'], path: string): string {
  return files.find((file) => file.path === path)?.contents ?? '';
}

describe('React variant rules', () => {
  const child: DocumentFile = {
    version: 1,
    id: 'rule-child',
    name: 'Rule child',
    kind: 'component',
    variants: [{ name: 'default' }, { name: 'compact' }, { name: 'dense' }],
    root: { id: 'root', type: 'frame', tag: 'div' },
  };

  it('emits ordered variant rule branches and falls back to default', () => {
    const host: DocumentFile = {
      version: 1,
      id: 'rule-host',
      name: 'Rule host',
      kind: 'component',
      fields: [
        { name: 'enabled', type: 'boolean' },
        { name: 'mode', type: 'text' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'main',
        children: [
          {
            id: 'child',
            type: 'instance',
            component: 'rule-child',
            variantRules: [
              { when: { path: 'enabled', truthy: true }, variant: 'compact' },
              { when: { path: 'mode', equals: 'dense' }, variant: 'dense' },
            ],
          },
        ],
      },
    };

    const output = source(
      generateReact({ documents: [host, child] }).ui,
      'components/RuleHost.tsx',
    );
    expect(output).toContain(
      "variant={enabled ? 'compact' : mode === 'dense' ? 'dense' : 'default'}",
    );
  });

  it('lets an explicit named variant override conditional rules', () => {
    const host: DocumentFile = {
      version: 1,
      id: 'explicit-rule-host',
      name: 'Explicit rule host',
      kind: 'component',
      fields: [{ name: 'enabled', type: 'boolean' }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'main',
        children: [
          {
            id: 'child',
            type: 'instance',
            component: 'rule-child',
            variants: { variant: 'dense' },
            variantRules: [{ when: { path: 'enabled', truthy: true }, variant: 'compact' }],
          },
        ],
      },
    };

    const output = source(
      generateReact({ documents: [host, child] }).ui,
      'components/ExplicitRuleHost.tsx',
    );
    expect(output).toContain("variant='dense'");
    expect(output).not.toContain("variant={enabled ? 'compact'");
  });
});
