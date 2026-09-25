/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import textarea from '../../../examples/textarea.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import { createEditorSession, type EditorSession } from '../src/session.js';
import { App } from '../src/ui/App.js';

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

describe('editor shell', () => {
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

  it('follows the store from the panels and undoes with Ctrl+Z', async () => {
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

    expect(host.textContent).toContain('Specimen');
    expect(host.textContent).toContain('specimen-section');
    expect(host.querySelector('nav.workspaces')).toBeNull();
    expect(host.querySelector('[data-asset-id="button"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-asset-id="card"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-asset-id="specimen"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-design="tokens"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-design="fonts"]')?.textContent).toContain('Fonts');
    const sectionRow = host.querySelector('[data-asset-id="specimen-section"]');
    expect(sectionRow).toBeInstanceOf(HTMLButtonElement);
    expect((sectionRow as HTMLButtonElement).draggable).toBe(true);
    expect((host.querySelector('[data-asset-id="button"]') as HTMLButtonElement).draggable).toBe(
      false,
    );
    await act(async () => {
      const event = new Event('dragstart', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          setData() {},
          effectAllowed: 'copy',
        },
      });
      sectionRow?.dispatchEvent(event);
    });
    expect(session.getSnapshot().drag).toEqual({ kind: 'asset', assetId: 'specimen-section' });
    await act(async () => {
      sectionRow?.dispatchEvent(new Event('dragend', { bubbles: true }));
    });
    expect(session.getSnapshot().drag).toBeNull();

    const frameTool = host.querySelector('.topbar-tools button.tool[aria-label="Frame"]');
    expect(frameTool).toBeInstanceOf(HTMLButtonElement);
    expect((frameTool as HTMLButtonElement).disabled).toBe(true);

    const sectionsToggle = host.querySelector('button[name="toggle-section"]');
    await act(async () => {
      (sectionsToggle as HTMLButtonElement).click();
    });
    expect(host.querySelector('[data-asset-id="specimen-section"]')).toBeNull();
    const sectionLayer = [...host.querySelectorAll('button.layer')].find((button) =>
      button.textContent?.includes('specimen-section'),
    );
    await act(async () => {
      sectionLayer?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    expect(session.getSnapshot().openId).toBe('specimen-section');
    expect(session.getSnapshot().selectedNodeId).toBe('root');
    const revealed = host.querySelector('[data-asset-id="specimen-section"]');
    expect(revealed?.className).toContain('is-active');
    expect(host.querySelector('[data-asset-id="button"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-asset-id="specimen"]')).toBeInstanceOf(HTMLButtonElement);

    const buttonAsset = host.querySelector('[data-asset-id="button"]');
    await act(async () => {
      (buttonAsset as HTMLButtonElement).click();
    });
    expect(session.getSnapshot().openId).toBe('button');
    const frame = document.querySelector('iframe');
    expect(frame?.contentDocument?.body.textContent).toContain('Button');

    await act(async () => {
      session.selectNode('root');
    });
    const tag = host.querySelector('input[name="tag"]');
    expect(tag).toBeInstanceOf(HTMLInputElement);
    expect((tag as HTMLInputElement).value).toBe('button');
    const direction = host.querySelector('select[name="layout-direction"]');
    expect(direction).toBeInstanceOf(HTMLSelectElement);
    expect((direction as HTMLSelectElement).value).toBe('row');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    });
    expect(session.getSnapshot().tool).toBe('frame');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(session.getSnapshot().tool).toBe('select');

    await act(async () => {
      session.execute({
        type: 'defineField',
        field: { name: 'label', type: 'text', default: 'Go' },
      });
    });
    expect(frame?.contentDocument?.body.textContent).toContain('Go');
    const label = host.querySelector('input[name="default-label"]');
    expect((label as HTMLInputElement).value).toBe('Go');

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
      );
    });
    expect(frame?.contentDocument?.body.textContent).toContain('Button');
    expect((host.querySelector('input[name="default-label"]') as HTMLInputElement).value).toBe(
      'Button',
    );
  });

  it('searches the tree, opens tokens and fonts, and creates an asset', async () => {
    const session: EditorSession = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    const view = document.createElement('div');
    host = view;
    document.body.append(view);
    root = createRoot(view);
    await act(async () => {
      root?.render(<App session={session} />);
    });

    const search = view.querySelector('input[name="asset-search"]');
    expect(search).toBeInstanceOf(HTMLInputElement);
    await act(async () => {
      setInput(search as HTMLInputElement, 'card');
    });
    expect(view.querySelector('[data-asset-id="card"]')).toBeInstanceOf(HTMLButtonElement);
    expect(view.querySelector('[data-asset-id="button"]')).toBeNull();
    expect(view.querySelector('[data-asset-id="specimen"]')).toBeNull();
    expect(view.querySelector('[data-design="tokens"]')).toBeNull();

    await act(async () => {
      setInput(search as HTMLInputElement, '');
    });
    await act(async () => {
      (view.querySelector('[data-design="tokens"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector('input[name="token-filter"]')).toBeInstanceOf(HTMLInputElement);
    expect(session.getSnapshot().openId).toBe('specimen');

    await act(async () => {
      (view.querySelector('[data-design="fonts"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector('input[name="font-sans-family"]')).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      (view.querySelector('button[name="create-atom"]') as HTMLButtonElement).click();
    });
    const created = session.getSnapshot();
    expect(created.openId).toBe('new-atom');
    expect(created.document.kind).toBe('atom');
    expect(created.document.name).toBe('New atom');
    expect(view.querySelector('[data-asset-id="new-atom"]')?.className).toContain('is-active');
    expect(view.querySelector('input[name="token-filter"]')).toBeNull();
  });

  it('shows a primary focus cue and writes a viewport style override from the inspector', async () => {
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
    await act(async () => {
      session.openAsset('button', 'root');
      session.setFocusViewport('tablet');
    });

    expect(host.querySelector('button[name="edit-base"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
    const viewportButton = host.querySelector('button[name="edit-viewport"]');
    expect(viewportButton?.textContent).toContain('tablet · 768');
    expect(host.textContent).toContain('Override bei 768');

    const padding = host.querySelector(
      'input[name="style-root-base-base-paddingInline"]',
    ) as HTMLInputElement;
    expect(padding.value).toBe('{button.padding.x}');

    await act(async () => {
      viewportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(session.getSnapshot().editTarget).toBe('viewport');
    expect(padding.value).toBe('{space.5}');

    const reset = [...host.querySelectorAll('.override-cue button')].find((button) =>
      button.textContent?.includes('Reset'),
    );
    await act(async () => {
      reset?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const styles = session.getSnapshot().document.styles;
    expect(styles?.declarations?.paddingInline).toBe('{button.padding.x}');
    expect(styles?.breakpoints?.tablet).toBeUndefined();
    expect(styles?.breakpoints?.desktop).toBeUndefined();
  });
});

function setInput(input: HTMLInputElement, value: string) {
  const prototype = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  prototype?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
