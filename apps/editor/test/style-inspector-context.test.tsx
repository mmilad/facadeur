/** @vitest-environment jsdom */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { DocumentFile } from '@facadeur/core';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardDesign, expandExampleCatalog } from './fixtures/example-catalog';

const source: DocumentFile = {
  version: 1,
  id: 'style-context',
  name: 'Style context',
  kind: 'component',
  settings: {
    breakpoints: [
      { id: 'mobile', minWidth: 375 },
      { id: 'tablet', minWidth: 768 },
    ],
  },
  variants: [
    { name: 'default' },
    {
      name: 'compact',
      overrides: {
        styles: {
          declarations: {
            opacity: '0.6',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'red',
          },
          states: { hover: { opacity: '0.9' } },
          breakpoints: { tablet: { declarations: { opacity: '0.8' } } },
          children: { label: { declarations: { opacity: '0.55' } } },
        },
      },
    },
  ],
  styles: {
    declarations: { opacity: '0.2' },
    states: { hover: { opacity: '0.3' } },
    breakpoints: {
      tablet: { declarations: { opacity: '0.4' }, states: { hover: { opacity: '0.7' } } },
    },
    children: { label: { declarations: { opacity: '0.5' } } },
  },
  root: {
    id: 'root',
    type: 'frame',
    children: [{ id: 'label', type: 'text', text: 'Label' }],
  },
};

const documents = expandExampleCatalog([source]);

describe('style inspector context', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  function mount(): EditorSession {
    const session = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    act(() => root?.render(<App session={session} />));
    act(() => {
      session.openAsset('style-context', 'root');
      session.selectNode('root');
      session.setActiveVariant('compact');
    });
    return session;
  }

  it('shows effective named variant values across breakpoint, state, and child layers', () => {
    const session = mount();
    act(() => {
      host
        ?.querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const manual = [...host!.querySelectorAll('button.eu-section__title')].find(
      (button) => button.textContent === 'Manual CSS properties',
    ) as HTMLButtonElement;
    act(() => manual.click());
    expect(
      (
        host?.querySelector(
          'input[name="style-root-variant-compact-base-opacity"]',
        ) as HTMLInputElement
      )?.value,
    ).toBe('0.6');

    act(() => {
      session.setFocusViewport('tablet');
      session.setEditTarget('viewport');
    });
    expect(
      (
        host?.querySelector(
          'input[name="style-root-variant-compact-base-opacity"]',
        ) as HTMLInputElement
      )?.value,
    ).toBe('0.8');

    act(() => {
      session.setEditTarget('base');
      const state = host?.querySelector('select[name="style-state"]') as HTMLSelectElement;
      state.value = 'hover';
      state.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(
      (
        host?.querySelector(
          'input[name="style-root-variant-compact-hover-opacity"]',
        ) as HTMLInputElement
      )?.value,
    ).toBe('0.9');

    act(() => {
      session.setEditTarget('base');
      const state = host?.querySelector('select[name="style-state"]') as HTMLSelectElement;
      state.value = '';
      state.dispatchEvent(new Event('change', { bubbles: true }));
      session.selectNode('label');
    });
    const childManual = [...host!.querySelectorAll('button.eu-section__title')].find(
      (button) => button.textContent === 'Manual CSS properties',
    ) as HTMLButtonElement;
    if (childManual.getAttribute('aria-expanded') === 'false') {
      act(() => childManual.click());
    }
    expect(
      (
        host?.querySelector(
          'input[name="style-label-variant-compact-base-opacity"]',
        ) as HTMLInputElement
      )?.value,
    ).toBe('0.55');
  });

  it('resets a named variant base value and keeps the canonical base untouched', () => {
    const session = mount();
    act(() => {
      host
        ?.querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const manual = [...host!.querySelectorAll('button.eu-section__title')].find(
      (button) => button.textContent === 'Manual CSS properties',
    ) as HTMLButtonElement;
    act(() => manual.click());
    const opacity = host?.querySelector('input[name="style-root-variant-compact-base-opacity"]');
    const reset = opacity?.closest('.declaration-row')?.querySelector('button');
    expect(reset).toBeTruthy();
    act(() => (reset as HTMLButtonElement).click());
    const stored = session.getSnapshot().document;
    expect(stored.styles?.declarations?.opacity).toBe('0.2');
    expect(stored.variantPresets?.[1]?.overrides?.styles?.declarations?.opacity).toBeUndefined();
  });

  it('persists a compound border edit as one undoable command', () => {
    const session = mount();
    act(() => {
      host
        ?.querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const style = host?.querySelector('select[name*="border-style"]') as HTMLSelectElement;
    expect(style).toBeTruthy();
    act(() => {
      style.value = 'dashed';
      style.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(session.getSnapshot().canUndo).toBe(true);
    expect(
      session.getSnapshot().document.variantPresets?.[1]?.overrides?.styles?.declarations
        ?.borderStyle,
    ).toBe('dashed');
    act(() => session.undo());
    expect(
      session.getSnapshot().document.variantPresets?.[1]?.overrides?.styles?.declarations
        ?.borderStyle,
    ).toBe('solid');
  });
});
