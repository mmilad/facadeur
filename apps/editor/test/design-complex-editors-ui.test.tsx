/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DesignShadowEditor,
  type DesignShadowInput,
} from '../src/ui/sidebar/design/DesignShadowEditor';
import {
  DesignTypographyEditor,
  type DesignTypographyValue,
} from '../src/ui/sidebar/design/DesignTypographyEditor';
import type { TypographyCatalogs } from '../src/ui/controls/typography/index';

const catalogs: TypographyCatalogs = {
  fontRefs: ['{font.sans}'],
  fontFamilyTokens: [],
  fontWeightTokens: [],
  dimensionTokens: [],
  numberTokens: [],
};

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.focus();
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
}

describe('complex design token editor UI', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  function render(node: ReactNode) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(node));
  }

  it('commits only the changed typography field when an override is absent', () => {
    const commits: (DesignTypographyValue | null)[] = [];
    const base = {
      fontFamily: '{font.sans}',
      fontSize: '16px',
      fontWeight: '{font.weight.regular}',
      lineHeight: 1.5,
      letterSpacing: '0',
    };
    render(
      <DesignTypographyEditor
        namePrefix="editor"
        value={base}
        baseValue={base}
        breakpointId="tablet"
        catalogs={catalogs}
        onCommit={(next) => commits.push(next)}
      />,
    );

    act(() => setInput(host!.querySelector('input[name="editor-fontSize"]')!, '20px'));
    expect(commits).toEqual([{ fontSize: '20px' }]);
  });

  it('keeps partial overrides while editing inherited fields and resets one field', () => {
    const commits: (DesignTypographyValue | null)[] = [];
    const base = {
      fontFamily: '{font.sans}',
      fontSize: '16px',
      fontWeight: '{font.weight.regular}',
      lineHeight: 1.5,
      letterSpacing: '0',
    };
    render(
      <DesignTypographyEditor
        namePrefix="editor"
        value={{ ...base, fontSize: '20px' }}
        storedValue={{ fontSize: '20px' }}
        baseValue={base}
        breakpointId="tablet"
        catalogs={catalogs}
        onCommit={(next) => commits.push(next)}
      />,
    );

    expect((host!.querySelector('input[name="editor-lineHeight"]') as HTMLInputElement).value).toBe(
      '1.5',
    );
    act(() => setInput(host!.querySelector('input[name="editor-lineHeight"]')!, '1.75'));
    expect(commits.at(-1)).toEqual({ fontSize: '20px', lineHeight: 1.75 });

    act(() =>
      (host!.querySelector('button[name="editor-fontSize-reset"]') as HTMLButtonElement).click(),
    );
    expect(commits.at(-1)).toEqual(null);
  });

  it('shows malformed typography values inline without invoking the host callback', () => {
    const commits: (DesignTypographyValue | null)[] = [];
    render(
      <DesignTypographyEditor
        namePrefix="editor"
        value={{
          fontFamily: '{font.sans}',
          fontSize: '16px',
          fontWeight: '{font.weight.regular}',
          lineHeight: 1.5,
        }}
        catalogs={catalogs}
        onCommit={(next) => commits.push(next)}
      />,
    );

    act(() => setInput(host!.querySelector('input[name="editor-fontSize"]')!, 'not-a-size'));
    expect(commits).toEqual([]);
    expect(host!.querySelector('[role="alert"]')?.textContent).toMatch(/length|dimension/i);
  });

  it('accepts fractional, viewport, functional, and keyword CSS typography values', () => {
    const commits: (DesignTypographyValue | null)[] = [];
    render(
      <DesignTypographyEditor
        namePrefix="editor"
        value={{
          fontFamily: '{font.sans}',
          fontSize: '.5rem',
          fontWeight: '{font.weight.regular}',
          lineHeight: 'normal',
          letterSpacing: '1vw',
        }}
        catalogs={catalogs}
        onCommit={(next) => commits.push(next)}
      />,
    );

    act(() =>
      setInput(host!.querySelector('input[name="editor-fontSize"]')!, 'clamp(1rem, 2vw, 2rem)'),
    );
    expect(commits.at(-1)).toEqual({
      fontFamily: '{font.sans}',
      fontSize: 'clamp(1rem, 2vw, 2rem)',
      fontWeight: '{font.weight.regular}',
      lineHeight: 'normal',
      letterSpacing: '1vw',
    });
  });

  it('rejects clearing a required structured shadow field without mutation', () => {
    const commits: (DesignShadowInput | null)[] = [];
    render(
      <DesignShadowEditor
        namePrefix="shadow"
        value={{
          color: '{color.shadow}',
          offsetX: '0px',
          offsetY: '2px',
          blur: '8px',
        }}
        shadowTokens={['{shadow.md}']}
        dimensionTokens={['{space.2}']}
        colorTokens={['{color.shadow}']}
        onCommit={(next) => commits.push(next)}
      />,
    );

    act(() => setInput(host!.querySelector('input[name="shadow-0-offsetX"]')!, ''));
    expect(commits).toEqual([]);
    expect(host!.querySelector('[role="alert"]')?.textContent).toMatch(/required/i);
  });

  it('accepts fractional and functional CSS lengths in structured shadows', () => {
    const commits: (DesignShadowInput | null)[] = [];
    render(
      <DesignShadowEditor
        namePrefix="shadow"
        value={{
          color: 'rgb(0 0 0 / 20%)',
          offsetX: '.5rem',
          offsetY: '2vh',
          blur: '8px',
        }}
        shadowTokens={[]}
        onCommit={(next) => commits.push(next)}
      />,
    );

    act(() =>
      setInput(host!.querySelector('input[name="shadow-0-blur"]')!, 'clamp(4px, 1vw, 12px)'),
    );
    expect(commits.at(-1)).toMatchObject({ blur: 'clamp(4px, 1vw, 12px)' });
  });
});
