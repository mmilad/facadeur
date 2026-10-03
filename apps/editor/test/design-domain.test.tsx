/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { App } from '../src/ui/shell/EditorShell';
import { editorStandardCatalog } from './fixtures/example-catalog';
import { openSettingsDomain } from './settings-navigation';

const documents = editorStandardCatalog();

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
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    await openSettingsDomain(host!, 'colors');
    expect(host!.textContent).toContain('Settings');
    expect(host!.textContent).toContain('Colors');
    expect(host!.textContent).toContain('--fcdr-color-accent-default');
    expect(host!.textContent).not.toContain('space.4');

    await act(async () => {
      session.setFocusViewport('sm');
      session.setEditTarget('viewport');
    });
    expect(host!.querySelector('[data-viewport-tab="sm"]')?.getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('returns to the asset preview when opening an asset from the tree', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    await openSettingsDomain(host!, 'spacing');
    expect(host!.querySelector('.design-domain-stage')).toBeTruthy();

    await act(async () => {
      (host!.querySelector('[data-asset-id="button"]') as HTMLButtonElement).click();
    });
    expect(host!.querySelector('.design-domain-stage')).toBeNull();
    expect(document.querySelector('iframe')).toBeTruthy();
  });
  it('preserves element selection, hides canvas editing and selects token breakpoints directly', async () => {
    const session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    session.openAsset('button');
    session.selectNode('root');
    const before = session.getSnapshot().document;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));
    await openSettingsDomain(host!, 'colors');
    expect(host!.querySelector('[aria-label="Layers"]')).toBeNull();
    expect(host!.querySelector('[aria-label="Inspector"]')).toBeNull();
    expect(host!.querySelector('[aria-label="Tools"]')).toBeNull();
    expect(host!.querySelector('[data-save="design"]')).not.toBeNull();
    expect(host!.querySelector('[data-save="document"]')).toBeNull();
    const desktop = host!.querySelector('[data-viewport-tab="xl"]') as HTMLButtonElement;
    await act(async () => {
      desktop.click();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(session.getSnapshot().editTarget).toBe('viewport');
    expect(session.getSnapshot().focusViewportId).toBe('xl');
    expect(session.getSnapshot().selectedNodeId).toBe('root');
    expect(session.getSnapshot().tool).toBe('select');
    expect(session.getSnapshot().document).toEqual(before);
    await openSettingsDomain(host!, 'fonts', { alreadyOpen: true });
    expect(host!.querySelector('[aria-label="Viewports"]')).toBeNull();
    expect(host!.textContent).toContain('Shared project resources');
    await act(async () =>
      (host!.querySelector('[data-surface="editor"]') as HTMLButtonElement).click(),
    );
    expect(session.getSnapshot().openId).toBe('button');
    expect(session.getSnapshot().selectedNodeId).toBe('root');
    expect(host!.querySelector('[aria-label="Inspector"]')).not.toBeNull();
  });

  it('keeps the viewport list in settings and shows it above token entries', async () => {
    const session = createEditorSession({ documents, design: createProjectTemplateDocument() });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root?.render(<App session={session} />));
    await openSettingsDomain(host!, 'viewports');

    expect(
      host!.querySelector('[data-settings-tab="viewports"]')?.getAttribute('aria-current'),
    ).toBe('page');
    const width = host!.querySelector(
      'input[name="settings-breakpoint-width-xl"]',
    ) as HTMLInputElement;
    expect(width).toBeInstanceOf(HTMLInputElement);
    const label = host!.querySelector(
      'input[name="settings-breakpoint-label-xs"]',
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
      session.getSnapshot().design.settings.breakpoints?.find((item) => item.id === 'xs')?.label,
    ).toBe('Mobile');
    await act(async () => {
      setter?.call(width, '1280');
      width.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(
      session.getSnapshot().design.settings.breakpoints?.find((item) => item.id === 'xl')?.minWidth,
    ).toBe(1280);

    await openSettingsDomain(host!, 'typography', { alreadyOpen: true });
    expect(host!.querySelector('[aria-label="Viewports"]')).toBeInstanceOf(HTMLElement);
    expect(host!.querySelector('[data-viewport-tab="xl"]')?.textContent).toContain('1280');
    expect(host!.querySelector('[data-viewport-tab="xs"]')?.textContent).toContain('Mobile');
    expect(host!.querySelector('[data-viewport-tab="xs"]')?.textContent).toContain('Base');
  });
});
