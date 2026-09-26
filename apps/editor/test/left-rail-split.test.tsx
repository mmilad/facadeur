/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';
import {
  LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT,
  LEFT_RAIL_PROJECT_RATIO_DEFAULT,
} from '../src/ui/shell/useLeftRailSplit.js';

const documents = validateCatalog([
  button,
  link,
  input,
  textarea,
  card,
  signIn,
  specimenSection,
  specimenPage,
]);

describe('left rail split', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
    window.localStorage.clear();
  });

  async function mount() {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    return host;
  }

  it('renders a vertical split handle between project and layers', async () => {
    const tree = await mount();
    const handle = tree.querySelector('.left-rail-split-handle');
    expect(handle).toBeInstanceOf(HTMLElement);
    expect(handle?.getAttribute('aria-orientation')).toBe('horizontal');
  });

  it('persists split ratio and collapse state in localStorage', async () => {
    const tree = await mount();
    const collapse = tree.querySelector('.left-rail-collapse');
    expect(collapse).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (collapse as HTMLButtonElement).click();
    });
    expect(window.localStorage.getItem('facadeur.leftRail.projectCollapsed')).toBe('1');
    expect(tree.querySelector('.left-rail-project-strip')).toBeInstanceOf(HTMLButtonElement);
    expect(tree.querySelector('.left-rail-split-handle')).toBeNull();

    const expand = tree.querySelector('.left-rail-project-strip');
    await act(async () => {
      (expand as HTMLButtonElement).click();
    });
    expect(window.localStorage.getItem('facadeur.leftRail.projectCollapsed')).toBe('0');
    expect(tree.querySelector('.left-rail-split-handle')).toBeInstanceOf(HTMLElement);
  });

  it('restores persisted layout after remount', async () => {
    window.localStorage.setItem('facadeur.leftRail.projectRatio', '0.5');
    window.localStorage.setItem('facadeur.leftRail.projectCollapsed', '1');
    const tree = await mount();
    const split = tree.querySelector('.left-rail-split') as HTMLElement;
    expect(split?.dataset.projectCollapsed).toBe('true');
    expect(split.style.gridTemplateRows).toBe(`${LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT}px 1fr`);

    window.localStorage.setItem('facadeur.leftRail.projectCollapsed', '0');
    await act(async () => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
    const remounted = await mount();
    const splitOpen = remounted.querySelector('.left-rail-split') as HTMLElement;
    expect(splitOpen.style.gridTemplateRows).toBe(`0.5fr 6px 0.5fr`);
  });

  it('defaults to a layers-friendly project ratio', async () => {
    await mount();
    expect(window.localStorage.getItem('facadeur.leftRail.projectRatio')).toBeNull();
    const split = document.querySelector('.left-rail-split') as HTMLElement;
    const expected = `${LEFT_RAIL_PROJECT_RATIO_DEFAULT}fr 6px ${1 - LEFT_RAIL_PROJECT_RATIO_DEFAULT}fr`;
    expect(split.style.gridTemplateRows).toBe(expected);
  });
});
