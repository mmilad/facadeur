/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { toFlat, type DocumentFile } from '@facadeur/core';
import {
  TokenPreviewProvider,
  useTokenPreview,
  useTokenLabel,
  useTokenSearchValue,
} from '../../src/ui/controls/fields/TokenPreviewContext';

function Preview({ reference }: { reference: string }) {
  return (
    <output data-search-value={useTokenSearchValue()(reference)}>
      {useTokenPreview(reference) ?? 'unresolved'}
    </output>
  );
}

function Label({ reference }: { reference: string }) {
  return <output>{useTokenLabel()(reference)}</output>;
}

describe('token previews', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  it('uses saved labels and refreshes them when the token is renamed', () => {
    const source: DocumentFile = {
      version: 1,
      id: 'labels',
      name: 'Labels',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: {
        color: {
          red: {
            '500': {
              $type: 'color',
              $value: '#ff0000',
              $extensions: { facadeur: { label: 'Warm' } },
            },
          },
        },
      },
    };
    const design = toFlat(source);
    const document = toFlat({ ...source, id: 'card', tokens: undefined });
    const host = window.document.createElement('div');
    const root = createRoot(host);
    const render = (next: typeof design) =>
      act(() =>
        root.render(
          <TokenPreviewProvider design={next} document={document} breakpointId={null}>
            <Label reference="{color.red.500}" />
          </TokenPreviewProvider>,
        ),
      );
    render(design);
    expect(host.textContent).toBe('Warm');
    render(
      toFlat({
        ...source,
        tokens: {
          color: {
            red: {
              '500': {
                $type: 'color',
                $value: '#ff0000',
                $extensions: { facadeur: { label: 'Bright' } },
              },
            },
          },
        },
      }),
    );
    expect(host.textContent).toBe('Bright');
    act(() => root.unmount());
  });
  it('uses an alias token label instead of inheriting its target label', () => {
    const source: DocumentFile = {
      version: 1,
      id: 'labels',
      name: 'Labels',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: {
        color: {
          red: {
            '500': {
              $type: 'color',
              $value: '#ff0000',
              $extensions: { facadeur: { label: 'Warm' } },
            },
            '600': {
              $type: 'color',
              $value: '{color.red.500}',
              $extensions: { facadeur: { label: 'Crimson' } },
            },
          },
        },
      },
    };
    const design = toFlat(source);
    const document = toFlat({ ...source, id: 'card', tokens: undefined });
    const host = window.document.createElement('div');
    const root = createRoot(host);
    act(() =>
      root.render(
        <TokenPreviewProvider design={design} document={document} breakpointId={null}>
          <Label reference="{color.red.500}" />
          <Label reference="{color.red.600}" />
        </TokenPreviewProvider>,
      ),
    );

    expect([...host.querySelectorAll('output')].map((output) => output.textContent)).toEqual([
      'Warm',
      'Crimson',
    ]);
    act(() => root.unmount());
  });
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
    expect(host.querySelectorAll('output')[0]?.getAttribute('data-search-value')).toBe(
      '{color.base}',
    );
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
