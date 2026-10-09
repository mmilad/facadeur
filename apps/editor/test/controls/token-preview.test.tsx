/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { toFlat, type DesignTokenSet, type DocumentFile } from '@facadeur/core';
import {
  TokenPreviewProvider,
  useTokenPreview,
  useTokenLabel,
  useTokenSearchValue,
} from '../../src/ui/controls/fields/TokenPreviewContext';
import { exampleIds as fixtureIds } from '@facadeur/examples';

const RED_500_UUID = fixtureIds.tokens.color.blue._500;
const RED_600_UUID = fixtureIds.tokens.color.blue._600;
const BASE_UUID = testUuid7;
const SURFACE_UUID = testUuid8;
const UNKNOWN_UUID = testUuid9;

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

function colorToken(uuid: string, label: string, group: string, value: string) {
  return { uuid, label, group, valueType: 'color' as const, value };
}

function tokenSet(colors: DesignTokenSet['color']): DesignTokenSet {
  return { color: colors, space: {}, radius: {}, shadow: {}, type: {}, font: {} };
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
      tokens: tokenSet({ [RED_500_UUID]: colorToken(RED_500_UUID, 'Warm', 'red', '#ff0000') }),
    };
    const design = toFlat(source);
    const document = toFlat({ ...source, id: 'card', tokens: undefined });
    const host = window.document.createElement('div');
    const root = createRoot(host);
    const render = (next: typeof design) =>
      act(() =>
        root.render(
          <TokenPreviewProvider design={next} document={document} breakpointId={null}>
            <Label reference={`{token:${RED_500_UUID}}`} />
          </TokenPreviewProvider>,
        ),
      );
    render(design);
    expect(host.textContent).toBe('Warm');
    render(
      toFlat({
        ...source,
        tokens: tokenSet({ [RED_500_UUID]: colorToken(RED_500_UUID, 'Bright', 'red', '#ff0000') }),
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
      tokens: tokenSet({
        [RED_500_UUID]: colorToken(RED_500_UUID, 'Warm', 'red', '#ff0000'),
        [RED_600_UUID]: colorToken(RED_600_UUID, 'Crimson', 'red', `{token:${RED_500_UUID}}`),
      }),
    };
    const design = toFlat(source);
    const document = toFlat({ ...source, id: 'card', name: 'Card', tokens: undefined });
    const host = window.document.createElement('div');
    const root = createRoot(host);
    act(() =>
      root.render(
        <TokenPreviewProvider design={design} document={document} breakpointId={null}>
          <Label reference={`{token:${RED_500_UUID}}`} />
          <Label reference={`{token:${RED_600_UUID}}`} />
        </TokenPreviewProvider>,
      ),
    );

    expect([...host.querySelectorAll('output')].map((output) => output.textContent)).toEqual([
      'Warm',
      'Crimson',
    ]);
    act(() => root.unmount());
  });

  it('resolves aliases and UUID-targeted global token sets without mutating references', () => {
    const design = toFlat({
      version: 1,
      id: 'design',
      name: 'Design',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokens: tokenSet({
        [BASE_UUID]: colorToken(BASE_UUID, 'Base', '', '#ff0000'),
        [SURFACE_UUID]: colorToken(SURFACE_UUID, 'Surface', '', `{token:${BASE_UUID}}`),
      }),
    } satisfies DocumentFile);
    const document = toFlat({
      version: 1,
      id: 'card',
      name: 'Card',
      kind: 'component',
      root: { id: 'root', type: 'frame' },
      tokenInterface: {
        reads: [BASE_UUID, SURFACE_UUID],
        sets: { [SURFACE_UUID]: `{token:${BASE_UUID}}` },
      },
    } satisfies DocumentFile);
    const host = window.document.createElement('div');
    const root = createRoot(host);
    act(() =>
      root.render(
        <TokenPreviewProvider design={design} document={document} breakpointId={null}>
          <Preview reference={`{token:${SURFACE_UUID}}`} />
          <Preview reference={`{token:${UNKNOWN_UUID}}`} />
        </TokenPreviewProvider>,
      ),
    );
    expect(host.querySelectorAll('output')[0]?.textContent).toBe('#ff0000');
    expect(host.querySelectorAll('output')[0]?.getAttribute('data-search-value')).toBe(
      `{token:${BASE_UUID}}`,
    );
    expect(host.querySelectorAll('output')[1]?.textContent).toBe('unresolved');
    expect(document.tokenInterface?.sets?.[SURFACE_UUID]).toBe(`{token:${BASE_UUID}}`);
    act(() =>
      root.render(
        <TokenPreviewProvider
          design={design}
          document={document}
          breakpointId={null}
          declarations={{ '--color-base': '#00ff00' }}
        >
          <Preview reference={`{token:${SURFACE_UUID}}`} />
        </TokenPreviewProvider>,
      ),
    );
    expect(host.querySelector('output')?.textContent).toBe('#00ff00');
    expect(document.tokenInterface?.sets?.[SURFACE_UUID]).toBe(`{token:${BASE_UUID}}`);
    act(() => root.unmount());
  });
});
