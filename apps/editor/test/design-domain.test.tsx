/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { EditorHost } from '../src/app/EditorHost';
import { clickSettingsTab, openSettingsDomain } from './settings-navigation';
import { createExampleCatalog, exampleIds as fixtureIds } from '@facadeur/examples';

const phoneUuid = fixtureIds.catalog.breakpoints.phone;
const tabletUuid = fixtureIds.catalog.breakpoints.tablet;
const ultraUuid = fixtureIds.catalog.breakpoints.ultra;

const testNavigation = {
  pathname: '/',
  search: '',
  push: (_href: string) => undefined,
  replace: (_href: string) => undefined,
};
describe('design domain stage', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  it('filters color tokens and supports viewport overrides in the stage view', async () => {
    const session: EditorSession = createEditorSession({ projectCatalog: createExampleCatalog() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<EditorHost session={session} navigation={testNavigation} />);
    });

    await openSettingsDomain(host!, 'colors');
    expect(host!.textContent).toContain('Settings');
    expect(host!.textContent).toContain('Colors');
    expect(host!.querySelector('[data-design-domain="colors"]')).not.toBeNull();
    expect(host!.textContent).toContain('Colors / Blue / 500');
    expect(host!.textContent).not.toContain('Spacing /');

    await act(async () => {
      session.setFocusViewport(tabletUuid);
      session.setEditTarget('viewport');
    });
    expect(
      host!.querySelector(`[data-viewport-tab="${tabletUuid}"]`)?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('keeps project font resources loaded when navigating from fonts to schemas', async () => {
    const session: EditorSession = createEditorSession({ projectCatalog: createExampleCatalog() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<EditorHost session={session} navigation={testNavigation} />);
    });

    await openSettingsDomain(host!, 'fonts');
    const designStyles = host!.querySelector('.app > style');
    expect(designStyles?.textContent).not.toContain('@import url(');
    expect(designStyles?.textContent).toContain('--type-body--font-family');
    expect(designStyles?.textContent).toContain('var(--font-system-ui)');
    expect(designStyles?.textContent).toContain('.design-domain-stage {');

    await act(async () => clickSettingsTab(host!, 'schemas'));
    expect(host!.querySelector('.design-domain-stage')).toBeNull();
    expect(host!.querySelector('.app > style')?.textContent).not.toContain('@import url(');
    expect(host!.querySelector('.app > style')?.textContent).toContain('--type-body--font-family');
    expect(host!.querySelector('.app > style')?.textContent).toContain('var(--font-system-ui)');
    expect(host!.querySelector('.app > style')?.textContent).toContain('.design-domain-stage {');
  });

  it('returns to the asset preview when opening an asset from the tree', async () => {
    const session: EditorSession = createEditorSession({ projectCatalog: createExampleCatalog() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<EditorHost session={session} navigation={testNavigation} />);
    });

    await openSettingsDomain(host!, 'spacing');
    expect(host!.querySelector('.design-domain-stage')).toBeTruthy();

    await act(async () => {
      (
        host!.querySelector(
          `[data-asset-id="${fixtureIds.components.button.definition}"]`,
        ) as HTMLButtonElement
      ).click();
    });
    expect(host!.querySelector('.design-domain-stage')).toBeNull();
    expect(document.querySelector('iframe')).toBeTruthy();
  });
  it('preserves element selection, hides canvas editing and selects token breakpoints directly', async () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    session.openAsset(fixtureIds.components.button.definition);
    session.selectNode('root');
    const before = session.getSnapshot().design;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root?.render(<EditorHost session={session} navigation={testNavigation} />),
    );
    await openSettingsDomain(host!, 'colors');
    expect(host!.querySelector('[aria-label="Layers"]')).toBeNull();
    expect(host!.querySelector('[aria-label="Inspector"]')).toBeNull();
    expect(host!.querySelector('[aria-label="Tools"]')).toBeNull();
    expect(host!.querySelector('[data-save="catalog"]')).not.toBeNull();
    const desktop = host!.querySelector(`[data-viewport-tab="${ultraUuid}"]`) as HTMLButtonElement;
    await act(async () => {
      desktop.click();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(session.getSnapshot().editTarget).toBe('viewport');
    expect(session.getSnapshot().focusViewportId).toBe(ultraUuid);
    expect(session.getSnapshot().selectedNodeId).toBe(fixtureIds.components.button.nodes.root);
    expect(session.getSnapshot().tool).toBe('select');
    expect(session.getSnapshot().design).toEqual(before);
    await openSettingsDomain(host!, 'fonts', { alreadyOpen: true });
    expect(host!.querySelector('[aria-label="Viewports"]')).toBeNull();
    expect(host!.textContent).toContain('Shared project resources');
    await act(async () =>
      (host!.querySelector('[data-surface="editor"]') as HTMLButtonElement).click(),
    );
    expect(session.getSnapshot().openId).toBe(fixtureIds.components.button.definition);
    expect(session.getSnapshot().selectedNodeId).toBe(fixtureIds.components.button.nodes.root);
    expect(host!.querySelector('[aria-label="Inspector"]')).not.toBeNull();
  });

  it('keeps the viewport list in settings and shows it above token entries', async () => {
    const session = createEditorSession({ projectCatalog: createExampleCatalog() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root?.render(<EditorHost session={session} navigation={testNavigation} />),
    );
    await openSettingsDomain(host!, 'viewports');

    expect(
      host!.querySelector('[data-settings-tab="viewports"]')?.getAttribute('aria-current'),
    ).toBe('page');
    const width = host!.querySelector(
      `input[name="settings-breakpoint-width-${ultraUuid}"]`,
    ) as HTMLInputElement;
    expect(width).toBeInstanceOf(HTMLInputElement);
    const label = host!.querySelector(
      `input[name="settings-breakpoint-label-${phoneUuid}"]`,
    ) as HTMLInputElement;
    expect(label.value).toBe('Phone');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      label.focus();
      setter?.call(label, 'Mobile');
      label.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      label.blur();
    });
    expect(
      session.getSnapshot().design.breakpoints.find((item) => item.uuid === phoneUuid)?.label,
    ).toBe('Mobile');
    await act(async () => {
      setter?.call(width, '1280');
      width.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      session.getSnapshot().design.breakpoints.find((item) => item.uuid === ultraUuid)?.minWidth,
    ).toBe(1280);

    await act(async () => clickSettingsTab(host!, 'colors'));
    expect(host!.querySelector('[aria-label="Viewports"]')).toBeInstanceOf(HTMLElement);
    expect(host!.querySelector(`[data-viewport-tab="${ultraUuid}"]`)?.textContent).toContain(
      '1280',
    );
    expect(host!.querySelector(`[data-viewport-tab="${phoneUuid}"]`)?.textContent).toContain(
      'Mobile',
    );
    expect(host!.querySelector(`[data-viewport-tab="${phoneUuid}"]`)?.textContent).toContain(
      'Base',
    );
  });
});
