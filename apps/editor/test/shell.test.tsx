/**
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';
import { openSettingsDomain } from './settings-navigation.js';

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
  const stylesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/ui/styles');

  it('uses viewport-height shell layout and independent sidebar scroll styles', () => {
    const baseCss = readFileSync(path.join(stylesDir, 'base.css'), 'utf8');
    const shellCss = readFileSync(path.join(stylesDir, 'shell.css'), 'utf8');
    const sidebarCss = readFileSync(path.join(stylesDir, 'sidebar.css'), 'utf8');

    expect(baseCss).toContain('height: 100vh');
    expect(baseCss).toContain('height: 100dvh');
    expect(baseCss.indexOf('height: 100vh')).toBeLessThan(baseCss.indexOf('height: 100dvh'));
    expect(baseCss).toMatch(/html\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(baseCss).toMatch(/body,\s*\n#__next\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(shellCss).toMatch(/\.workspace\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(sidebarCss).toMatch(/\.side-scroll\s*\{[\s\S]*?overflow:\s*auto/);
  });

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

  it('renders shell regions that participate in the height layout', async () => {
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

    expect(host.querySelector('.app')).toBeInstanceOf(HTMLDivElement);
    expect(host.querySelector('.workspace')).toBeInstanceOf(HTMLDivElement);
    expect(host.querySelector('aside.side-left')).toBeInstanceOf(HTMLElement);
    expect(host.querySelector('aside.side-right.inspector-rail')).toBeInstanceOf(HTMLElement);
    expect(host.querySelector('.side-scroll')).toBeInstanceOf(HTMLDivElement);
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
    expect(host.querySelector('.kind-badge')?.textContent).toBe('page');
    expect(host.querySelector('[data-testid="inspector-context"]')?.textContent).toContain(
      'Specimen',
    );
    expect(host.textContent).toContain('specimen-section');
    expect(host.querySelector('nav.workspaces')).toBeNull();
    expect(host.querySelector('[data-asset-id="button"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-asset-id="card"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-asset-id="specimen"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.querySelector('[data-surface="icons"]')?.textContent).toContain('Icons');
    expect(host.querySelector('.side-left [data-design-domain="icons"]')).toBeNull();
    expect(host.querySelector('[data-design-domain="colors"]')).toBeNull();
    expect(host.querySelector('[data-subnav="settings"]')?.textContent).toContain('Settings');
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
    expect(session.getSnapshot().openId).toBe('specimen');
    expect(session.getSnapshot().selectedNodeId).toBe('specimen-section');
    expect(session.getSnapshot().nestedSelection).toBeNull();
    await act(async () => {
      session.drillToMaster('specimen-section');
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
    expect(host.querySelector('.kind-badge')?.textContent).toBe('atom');
    expect(host.querySelector('.layers-document-title')?.textContent).toBe('Button');

    await act(async () => {
      session.selectNode('root');
    });
    expect(host.querySelector('[data-testid="inspector-context"]')?.textContent).toContain(
      'Button',
    );
    const tag = host.querySelector('select[name="tag"]');
    expect(tag).toBeInstanceOf(HTMLSelectElement);
    expect((tag as HTMLSelectElement).value).toBe('button');
    await act(async () => {
      host!
        .querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const direction = host.querySelector('button[aria-label="Horizontal"]');
    expect(direction).toBeInstanceOf(HTMLButtonElement);
    expect(direction?.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    });
    expect(session.getSnapshot().tool).toBe('frame');
    const insertCue = () => host!.querySelector('[data-testid="insert-mode-cue"]');
    expect(insertCue()?.textContent).toContain('Frame tool');
    expect(insertCue()?.textContent).toContain('Esc or V (Select)');
    expect(host!.querySelector('[data-testid="stage-hint"]')).toBeNull();
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(session.getSnapshot().tool).toBe('select');
    expect(insertCue()).toBeNull();
    expect(host!.querySelector('[data-testid="stage-hint"]')?.textContent).toContain(
      'F T I insert',
    );

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
    });
    expect(insertCue()?.textContent).toContain('Text tool');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    });
    expect(session.getSnapshot().tool).toBe('select');
    expect(insertCue()).toBeNull();

    await act(async () => {
      host!
        .querySelector('button[name="property-tab-content"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      session.execute({
        type: 'defineField',
        field: { name: 'label', type: 'text' },
      });
      session.execute({
        type: 'setPreviewData',
        previewData: { fields: { label: 'Go' } },
      });
    });
    expect(session.getSnapshot().document.previewData?.fields?.label).toBe('Go');
    await act(async () => {
      host!
        .querySelector('button[data-surface="schema"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      const fieldToggle = [...host!.querySelectorAll('button.eu-section__title')].find(
        (button) => button.textContent === 'Label',
      );
      fieldToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('select[name="field-type-label"]')).toBeInstanceOf(HTMLSelectElement);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
      );
    });
    await act(async () => {
      host!
        .querySelector('button[data-surface="editor"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(session.getSnapshot().document.name).toBe('Button');
  });

  it('zooms from the topbar without changing reset view', async () => {
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

    expect(host.querySelector('.zoom-controls .zoom-readout')?.textContent).toBe('100%');
    const viewport = host.querySelector('.viewport');
    expect(viewport).toBeInstanceOf(HTMLDivElement);
    Object.defineProperty(viewport, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(viewport, 'clientHeight', { value: 600, configurable: true });
    const zoomIn = host.querySelector('.zoom-controls button[aria-label="Zoom in"]');
    expect(zoomIn).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      (zoomIn as HTMLButtonElement).click();
    });
    expect(session.getSnapshot().zoomLabel).toBe('110%');

    const resetView = [...host.querySelectorAll('.topbar button.text-button')].find((button) =>
      button.textContent?.includes('Reset view'),
    );
    expect(resetView).toBeInstanceOf(HTMLButtonElement);
  });

  it('shows unsaved badges for document and design edits', async () => {
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

    expect(host.querySelector('[data-unsaved="document"]')).toBeNull();
    expect(host.querySelector('[data-unsaved="design"]')).toBeNull();

    await act(async () => {
      session.openAsset('specimen-section');
      session.execute({ type: 'setProp', nodeId: 'heading', prop: 'text', value: 'Dirty' });
    });
    expect(host.querySelector('[data-unsaved="document"]')).toBeTruthy();
    expect(host.querySelector('[data-unsaved="document"]')?.textContent).toContain('Document');
    expect(host.querySelector('[data-unsaved="design"]')).toBeNull();

    await act(async () => {
      session.executeDesign({
        type: 'setToken',
        path: 'color.accent.default',
        token: { $value: '#abcdef' },
      });
    });
    expect(host.querySelector('[data-unsaved="design"]')?.textContent).toContain('Design');
  });

  it('searches the tree, opens design domains on the stage, and creates an asset', async () => {
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
    expect(view.querySelector('[data-design-domain="colors"]')).toBeNull();

    await act(async () => {
      setInput(search as HTMLInputElement, '');
    });
    await openSettingsDomain(view, 'colors');
    expect(view.querySelector('.design-domain-stage[data-design-domain="colors"]')).toBeTruthy();
    expect(view.querySelector('input[name="token-filter"]')).toBeInstanceOf(HTMLInputElement);
    expect(view.querySelector('iframe')).toBeNull();
    expect(session.getSnapshot().openId).toBe('specimen');

    await openSettingsDomain(view, 'fonts', { alreadyOpen: true });
    expect(view.querySelector('.design-domain-stage[data-design-domain="fonts"]')).toBeTruthy();
    await act(async () => {
      (view.querySelector('button[name="font-details-sans"]') as HTMLButtonElement).click();
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

  it('keeps native text controls in the form component group', async () => {
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

    expect(host.querySelector('[data-group="atom"] [data-asset-id="input"]')).toBeNull();
    const formGroup = host.querySelector('[data-group="component:form"]');
    expect(formGroup).toBeInstanceOf(HTMLElement);
    expect(formGroup?.querySelector('[data-asset-id="input"]')).toBeInstanceOf(HTMLButtonElement);
    expect(formGroup?.querySelector('[data-asset-id="textarea"]')).toBeInstanceOf(
      HTMLButtonElement,
    );
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
      session.setFocusViewport('sm');
    });

    expect(host.querySelector('button[name="edit-base"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
    const viewportButton = host.querySelector('button[name="edit-viewport"]');
    expect(viewportButton?.textContent).toContain('Tablet · 768');

    const styleTab = host.querySelector('button[name="property-tab-style"]');
    await act(async () => {
      styleTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const cssRules = [...host.querySelectorAll('.eu-section__title--collapsible')].find(
      (title) => title.textContent === 'CSS rules',
    );
    await act(async () => {
      cssRules?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const padding = host.querySelector(
      'button[name="style-root-base-base-paddingInline"]',
    ) as HTMLButtonElement;
    expect(padding.textContent).toContain('Padding X');

    await act(async () => {
      viewportButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(session.getSnapshot().editTarget).toBe('viewport');
    expect(padding.textContent).toBe('5');
    expect(host.textContent).toContain('Override at 768');

    const reset = [...host.querySelectorAll('.override-cue button')].find((button) =>
      button.textContent?.includes('Reset'),
    );
    await act(async () => {
      reset?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const styles = session.getSnapshot().document.styles;
    expect(styles?.declarations?.paddingInline).toBe('{padding.x}');
    expect(styles?.breakpoints?.sm).toBeUndefined();
    expect(styles?.breakpoints?.xl).toBeUndefined();
  });

  it('shows a drill breadcrumb and clears it when opening from the tree', async () => {
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
    const view = host;

    expect(view.querySelector('.topbar-breadcrumb')).toBeNull();
    await act(async () => {
      session.selectNode('specimen-section');
      session.drillToMaster('specimen-section');
    });
    const trail = view.querySelector('.topbar-breadcrumb');
    expect(trail?.textContent).toContain('Specimen');
    expect(trail?.textContent).toContain('›');
    expect(trail?.textContent).toContain('Specimen section');
    expect(view.querySelectorAll('.topbar-breadcrumb-parent')).toHaveLength(1);
    expect(view.querySelector('.topbar-breadcrumb-current')?.textContent).toBe('Specimen section');
    expect(view.querySelector('.kind-badge')?.textContent).toBe('section');

    await act(async () => {
      (view.querySelector('.topbar-breadcrumb-parent') as HTMLButtonElement).click();
    });
    expect(session.getSnapshot().openId).toBe('specimen');
    expect(session.getSnapshot().selectedNodeId).toBe('specimen-section');
    expect(view.querySelector('.topbar-breadcrumb')).toBeNull();

    await act(async () => {
      session.selectNode('specimen-section');
      session.drillToMaster('specimen-section');
      (view.querySelector('[data-asset-id="button"]') as HTMLButtonElement).click();
    });
    expect(view.querySelector('.topbar-breadcrumb')).toBeNull();
  });
});

function setInput(input: HTMLInputElement, value: string) {
  const prototype = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  prototype?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
