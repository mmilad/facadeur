import { describe, expect, it } from 'vitest';
import type { FlatDocument } from '@facadeur/core';
import {
  readNodeStyleDraft,
  readNodeStyleFallback,
} from '../src/domain/style-rules/node-style-draft';
import { exampleIds as fixtureIds } from '@facadeur/examples';

const document = {
  rootId: 'root',
  nodes: {
    root: { id: 'root', type: 'frame', children: ['button'] },
    button: { id: 'button', type: 'frame', style: { letterSpacing: '2px' } },
  },
  styles: {
    children: {
      button: {
        declarations: { color: 'red' },
        breakpoints: { [fixtureIds.catalog.breakpoints.tablet]: { declarations: { color: 'blue' } }, [fixtureIds.catalog.breakpoints.desktop]: { declarations: { color: 'green' } },
        },
      },
    },
  },
} as unknown as FlatDocument;

const breakpoints = [
  { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 0 },
  { uuid: fixtureIds.catalog.breakpoints.tablet, label: 'Tablet', minWidth: 768 },
  { uuid: fixtureIds.catalog.breakpoints.desktop, label: 'Desktop', minWidth: 1200 },
];

describe('ordinary class CSS drafts', () => {
  it('includes inline declarations when a node has no style-block child', () => {
    const inlineOnly = {
      ...document,
      styles: undefined,
    } as unknown as FlatDocument;
    expect(readNodeStyleDraft(inlineOnly, 'button', { nodeId: 'button' }, breakpoints)).toEqual({
      'letter-spacing': '2px',
    });
  });

  it('keeps base drafts free of wider breakpoint overrides', () => {
    expect(readNodeStyleDraft(document, 'button', { nodeId: 'button' }, breakpoints)).toEqual({
      color: 'red',
      'letter-spacing': '2px',
    });
  });

  it('shows a breakpoint cascade and reads its reset fallback without that layer', () => {
    expect(
      readNodeStyleDraft(
        document,
        'button',
        { nodeId: 'button', breakpointId: fixtureIds.catalog.breakpoints.tablet },
        breakpoints,
      ),
    ).toEqual({ color: 'blue', 'letter-spacing': '2px' });
    expect(
      readNodeStyleFallback(
        document,
        'button',
        { nodeId: 'button', breakpointId: fixtureIds.catalog.breakpoints.tablet },
        breakpoints,
      ),
    ).toEqual({ color: 'red', 'letter-spacing': '2px' });
  });
});
