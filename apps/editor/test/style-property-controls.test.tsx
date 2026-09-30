/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { StyleDeclarationField } from '../src/ui/controls/style/StyleDeclarationField.js';
import type { TypographyCatalogs } from '../src/ui/controls/typography/index.js';
import {
  enumOptionsForProperty,
  stylePropertyLabel,
} from '../src/ui/controls/style/declaration-kind.js';

const catalogs = {
  colorTokens: [],
  shadowTokens: [],
  typographyTokens: [],
  dimensionTokens: [],
  typographyCatalogs: {
    fontRefs: [],
    fontFamilyTokens: [],
    fontWeightTokens: [],
    dimensionTokens: [],
    numberTokens: [],
  },
} satisfies {
  colorTokens: readonly string[];
  shadowTokens: readonly string[];
  typographyTokens: readonly string[];
  dimensionTokens: readonly string[];
  typographyCatalogs: TypographyCatalogs;
};

describe('style property controls', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('keeps CSS values exact while giving visibility options readable labels', () => {
    const commits: string[] = [];
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => {
      root?.render(
        <StyleDeclarationField
          property="visibility"
          value="hidden"
          name="visibility"
          {...catalogs}
          onCommit={(next) => commits.push(next)}
        />,
      );
    });
    const select = host.querySelector('select[name="visibility"]') as HTMLSelectElement;
    expect([...select.options].map((option) => option.textContent)).toEqual([
      'Unset',
      'Visible',
      'Hidden (keeps space)',
      'Collapse',
    ]);
    expect(select.value).toBe('hidden');
    act(() => {
      select.value = 'collapse';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(commits).toEqual(['collapse']);
  });

  it('supports grid display modes, Native appearance, and an explicit empty enum value', () => {
    expect(enumOptionsForProperty('display')).toContain('grid');
    expect(enumOptionsForProperty('display')).toContain('inline-grid');
    expect(stylePropertyLabel('appearance')).toBe('Native appearance');

    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => {
      root?.render(
        <>
          <StyleDeclarationField
            property="display"
            value="none"
            name="display"
            {...catalogs}
            onCommit={() => undefined}
          />
          <StyleDeclarationField
            property="appearance"
            value="auto"
            name="appearance"
            {...catalogs}
            onCommit={() => undefined}
          />
          <StyleDeclarationField
            property="visibility"
            value=""
            name="empty-visibility"
            {...catalogs}
            onCommit={() => undefined}
          />
        </>,
      );
    });
    const display = host.querySelector('select[name="display"]') as HTMLSelectElement;
    expect(display.value).toBe('none');
    expect([...display.options].find((option) => option.value === 'none')?.textContent).toBe(
      'None (removes space)',
    );
    expect([...display.options].map((option) => option.value)).toContain('inline-grid');
    expect(host.textContent).toContain('Native appearance');
    const empty = host.querySelector('select[name="empty-visibility"]') as HTMLSelectElement;
    expect(empty.value).toBe('');
    expect(empty.options[0]?.textContent).toBe('Unset');
  });

  it('keeps an unknown enum value directly editable', () => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => {
      root?.render(
        <StyleDeclarationField
          property="display"
          value="subgrid"
          name="display-unknown"
          {...catalogs}
          onCommit={() => undefined}
        />,
      );
    });
    expect(host.querySelector('select[name="display-unknown"]')).toBeNull();
    expect((host.querySelector('input[name="display-unknown"]') as HTMLInputElement).value).toBe(
      'subgrid',
    );
  });
});
