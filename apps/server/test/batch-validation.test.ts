import { expect, it } from 'vitest';
import type { Command } from '@facadeur/core';
import { assertCommand } from '../src/project/validation';
it('validates editable document metadata before dispatching to Core', () => {
  expect(() =>
    assertCommand({ type: 'setDocumentMetadata', name: 'Button', slug: 'action' }),
  ).not.toThrow();
  expect(() =>
    assertCommand({ type: 'setDocumentMetadata', name: 'Button' } as unknown as Command),
  ).toThrow('requires slug');
  expect(() =>
    assertCommand({ type: 'setDocumentMetadata', name: 'Button', slug: 42 } as unknown as Command),
  ).toThrow('must be a string');
});
it('validates each nested batch command before execution', () => {
  expect(() =>
    assertCommand({
      type: 'batch',
      commands: [{ type: 'setStyle', nodeId: 'root', property: 'display', value: 'grid' }],
    }),
  ).not.toThrow();
  expect(() =>
    assertCommand({
      type: 'batch',
      commands: [{ type: 'setStyle', nodeId: 'root', property: 'display' }],
    } as unknown as Command),
  ).toThrow(/requires value/);
  expect(() =>
    assertCommand({ type: 'batch', commands: 'invalid' } as unknown as Command),
  ).toThrow();
  expect(() =>
    assertCommand({
      type: 'batch',
      commands: Array.from({ length: 101 }, () => ({ type: 'remove', nodeId: 'root' })),
    }),
  ).toThrow();
});
