/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { toFlat, type DocumentFile } from '@facadeur/core';
import {
  TokenPreviewProvider,
  useTokenPreview,
} from '../../src/ui/controls/fields/TokenPreviewContext.js';

function Preview({ reference }: { reference: string }) {
  return <output>{useTokenPreview(reference) ?? 'unresolved'}</output>;
}

describe('token previews', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  it('resolves aliases and document token sets without mutating references', () => {
    const design = toFlat({
      version: 1,
      id: 'design',
      name: 'Design',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: {
        color: {
          base: { $type: 'color', $value: '#ff0000' },
          surface: { $type: 'color', $value: '{color.base}' },
        },
      },
    } as DocumentFile);
    const document = toFlat({
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokenInterface: {
        reads: ['color.base', 'color.surface'],
        sets: { 'color.surface': '{color.base}' },
      },
    } as DocumentFile);
    const host = window.document.createElement('div');
    const root = createRoot(host);
    act(() =>
      root.render(
        <TokenPreviewProvider design={design} document={document} breakpointId={null}>
          <Preview reference="{color.surface}" />
          <Preview reference="{unknown.color}" />
        </TokenPreviewProvider>,
      ),
    );
    expect(host.querySelectorAll('output')[0]?.textContent).toBe('#ff0000');
    expect(host.querySelectorAll('output')[1]?.textContent).toBe('unresolved');
    expect(document.tokenInterface?.sets?.['color.surface']).toBe('{color.base}');
    act(() =>
      root.render(
        <TokenPreviewProvider
          design={design}
          document={document}
          breakpointId={null}
          declarations={{ '--color-base': '#00ff00' }}
        >
          <Preview reference="{color.surface}" />
        </TokenPreviewProvider>,
      ),
    );
    expect(host.querySelector('output')?.textContent).toBe('#00ff00');
    expect(document.tokenInterface?.sets?.['color.surface']).toBe('{color.base}');
    act(() => root.unmount());
  });
});
