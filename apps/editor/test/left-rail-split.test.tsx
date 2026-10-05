/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';
import {
  LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT,
  LEFT_RAIL_PROJECT_RATIO_DEFAULT,
  projectRatioFromPointer,
} from '../src/ui/shell/useLeftRailSplit';

const documents = editorStandardCatalog();

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
      design: editorStandardDesign(),
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
    const panes = tree.querySelectorAll('.left-rail-pane');
    expect(panes[0]?.classList.contains('left-rail-pane-layers')).toBe(true);
    expect(panes[1]?.classList.contains('left-rail-pane-project')).toBe(true);
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
    expect(
      tree
        .querySelector('.left-rail-pane-project')
        ?.lastElementChild?.classList.contains('left-rail-project-strip'),
    ).toBe(true);
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
    expect(split.style.gridTemplateRows).toBe(`1fr ${LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT}px`);

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
    const expected = `${1 - LEFT_RAIL_PROJECT_RATIO_DEFAULT}fr 6px ${LEFT_RAIL_PROJECT_RATIO_DEFAULT}fr`;
    expect(split.style.gridTemplateRows).toBe(expected);
  });

  it('maps the drag boundary to the bottom project share and clamps short rails', () => {
    expect(projectRatioFromPointer(700, 100, 1100)).toBeCloseTo(0.4024, 3);
    expect(projectRatioFromPointer(300, 100, 1100)).toBe(0.72);
    expect(projectRatioFromPointer(150, 100, 150)).toBe(0.5);
    expect(projectRatioFromPointer(100, 100, 105)).toBeUndefined();
  });
});
