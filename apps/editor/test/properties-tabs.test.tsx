/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import formToggle from '../../../examples/form-toggle.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import textarea from '../../../examples/textarea.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

const variantComponent: DocumentFile = {
  version: 1,
  id: 'variant-component',
  name: 'Variant component',
  kind: 'component',
  variants: [
    { name: 'default' },
    { name: 'compact', overrides: { nodes: { root: { text: 'Compact' } } } },
  ],
  root: { id: 'root', type: 'text', tag: 'span', text: 'Base' },
};

const documents = validateCatalog([
  button,
  link,
  input,
  textarea,
  formToggle,
  card,
  signIn,
  specimenSection,
  specimenPage,
  variantComponent,
]);

describe('properties inspector tabs', () => {
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

  it('keeps layout controls in the Style tab', async () => {
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
      session.openAsset('input', 'root');
    });

    expect(host.querySelector('button[name="property-tab-content"]')).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(host.querySelector('select[name="tag"]')).toBeInstanceOf(HTMLSelectElement);
    expect(host.querySelector('button[name="property-tab-layout"]')).toBeNull();

    await act(async () => {
      host!
        .querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('select[name="layout-direction"]')).toBeInstanceOf(HTMLSelectElement);
    expect(host.querySelector('select[name="tag"]')).toBeNull();
  });

  it('shows named variants above the inspector and resolves their values for editing', async () => {
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
      session.openAsset('variant-component', 'root');
      session.selectNode('root');
    });

    expect(host.querySelector('button[name="variant-tab-default"]')).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(host.querySelector('button[name="variant-tab-compact"]')).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(host.querySelector('textarea[name="text"]')?.getAttribute('value')).toBeNull();
    expect((host.querySelector('textarea[name="text"]') as HTMLTextAreaElement)?.value).toBe(
      'Base',
    );

    await act(async () => {
      host!
        .querySelector('button[name="variant-tab-compact"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(session.getSnapshot().activeVariantName).toBe('compact');
    expect(session.getSnapshot().document.nodes.root).toMatchObject({ text: 'Base' });
    expect(session.getSnapshot().activeDocument.nodes.root).toMatchObject({ text: 'Compact' });
    expect((host.querySelector('textarea[name="text"]') as HTMLTextAreaElement)?.value).toBe(
      'Compact',
    );
  });

  it('always shows Default as the first variant tab', async () => {
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
      session.openAsset('input', 'root');
      session.selectNode('root');
    });

    expect(host.querySelector('button[name="variant-tab-default"]')).toBeInstanceOf(
      HTMLButtonElement,
    );
    expect(host.querySelector('.variant-tabs-list button:nth-child(1)')?.textContent).toBe(
      'Default',
    );
    expect(host.querySelector('button[name="property-style-tab-variants"]')).toBeNull();
  });

  it('creates a stable variant id from a free display label and activates it', async () => {
    const user = userEvent.setup();
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
      session.selectNode('root');
      session.execute({ type: 'setVariantLabels', labels: { default: 'Text Input' } });
    });

    await act(async () => {
      await user.click(host!.querySelector('button[aria-label="Add variant"]')!);
      await user.type(document.querySelector('input[name="new-variant-name"]')!, 'Dark Mode');
      await user.click(document.querySelector('button.eu-button--primary')!);
    });

    expect(session.getSnapshot().activeVariantName).toBe('variant-1');
    expect(session.getSnapshot().document.variantPresets).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'variant-1' })]),
    );
    expect(session.getSnapshot().document.variantLabels).toMatchObject({
      default: 'Text Input',
      'variant-1': 'Dark Mode',
    });
    expect(host.querySelector('button[name="variant-tab-variant-1"]')?.textContent).toBe(
      'Dark Mode',
    );
  });

  it('groups style declarations by purpose', async () => {
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
      session.openAsset('input', 'root');
      session.selectNode('control');
    });
    await act(async () => {
      host!
        .querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      host.querySelector('button[name="property-tab-style"]')?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(host.querySelector('.eu-section__title')?.textContent).toBe('Layout');
    expect(host.textContent).toContain('Typography');
    expect(host.textContent).toContain('Surface');
    expect(host.textContent).toContain('Advanced CSS');
    expect(
      [...host.querySelectorAll('.eu-section__title--collapsible')].find(
        (title) => title.textContent === 'Add property',
      ),
    ).toBeTruthy();
  });

  it('puts layout declarations in the Layout group', async () => {
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
      session.openAsset('input', 'root');
      session.selectNode('control');
    });
    await act(async () => {
      host!
        .querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.textContent).toContain('Advanced CSS');
    expect(host.textContent).not.toContain('Other');
    expect(
      [...host.querySelectorAll('.eu-section__title')].some(
        (title) => title.textContent === 'CSS rules',
      ),
    ).toBe(true);
  });

  it('keeps the selected properties tab when selection changes', async () => {
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
      session.openAsset('textarea', 'root');
      session.selectNode('control');
    });
    await act(async () => {
      host!
        .querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('select[name="tag"]')).toBeNull();

    await act(async () => {
      session.selectNode('root');
    });
    expect(
      host.querySelector('button[name="property-tab-style"]')?.getAttribute('aria-selected'),
    ).toBe('true');
    expect(host.querySelector('select[name="tag"]')).toBeNull();
  });

  it('shows the document path for a nested selection', async () => {
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
      session.openAsset('specimen-section', 'root');
      session.selectNode('input-row');
    });

    expect(host.querySelector('.inspector-context-path')?.textContent).toBe(
      'Specimen section / fields / input-row',
    );
    expect(host.querySelector('.inspector-id')).toBeNull();
  });

  it('labels the component root as the document being edited', async () => {
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
      session.openAsset('input', 'root');
      session.selectNode('root');
    });

    const context = host.querySelector('[data-testid="inspector-context"]');
    expect(context?.querySelector('.inspector-context-kicker')?.textContent).toBe('Component root');
    expect(context?.querySelector('.inspector-context-title')?.textContent).toBe('Input');
    expect(context?.querySelector('.inspector-context-meta')?.textContent).toBe(
      'Root frame · Input',
    );
    expect(host.textContent).not.toContain('Component fields');
  });

  it('explains inherited styles for an empty variant override', async () => {
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
      session.openAsset('form-toggle', 'root');
      session.selectNode('switch');
    });
    await act(async () => {
      host!
        .querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      host!
        .querySelector('button[name="property-style-tab-variants"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.textContent).toContain(
      'No overrides for this variant. It inherits the base styles.',
    );
  });

  it('makes instance overrides and the master relationship explicit', async () => {
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
      session.openAsset('specimen', 'root');
      session.selectNode('specimen-section');
    });

    const context = host.querySelector('[data-testid="inspector-context"]');
    expect(context?.querySelector('.inspector-context-kicker')?.textContent).toBe(
      'Instance override',
    );
    expect(context?.querySelector('.inspector-context-title')?.textContent).toBe(
      'Specimen section',
    );
    expect(context?.textContent).toContain('edit master for shared changes');
    expect(host.querySelector('[name="open-component"]')?.textContent).toContain(
      'Edit master · Specimen section',
    );
    expect(host.textContent).toContain('This component exposes no fields or variants yet.');

    await act(async () => {
      host!
        .querySelector('button[name="property-tab-style"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('button[name="layout-margin"]')).toBeInstanceOf(HTMLButtonElement);
    expect(host.textContent).toContain('Inherited appearance from');
    expect(host.querySelector('button[name="open-component"]')).toBeInstanceOf(HTMLButtonElement);
  });

  it('mounts field definitions on Content and legacy variant axes on Schema (Spec C)', async () => {
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
      session.selectNode(null);
    });

    expect(host.querySelector('input[name="new-field-name"]')).toBeNull();
    await act(async () => {
      host!
        .querySelector('button[data-surface="schema"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      host!
        .querySelector('button[name="open-add-field"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('input[name="new-field-name"]')).toBeInstanceOf(HTMLInputElement);
    expect(host.querySelector('input[name="new-axis-name"]')).toBeInstanceOf(HTMLInputElement);

    await act(async () => {
      host!
        .querySelector('button[data-surface="schema"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(host.querySelector('input[name="new-axis-name"]')).toBeInstanceOf(HTMLInputElement);
  });

  it('does not show property tabs when a viewport is selected', async () => {
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

    const viewportRow = [...host.querySelectorAll('button.viewport-layer')].find((button) =>
      button.dataset.breakpoint === 'xs',
    );
    await act(async () => {
      viewportRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(host.querySelector('button[name="property-tab-content"]')).toBeNull();
    expect(host.querySelector('input[name="viewport-inner-padding"]')).toBeInstanceOf(
      HTMLInputElement,
    );
  });

  it('shows the selected viewport context before its preview settings', async () => {
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
      host!
        .querySelector('button[data-breakpoint="sm"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const context = host.querySelector('[data-testid="viewport-context"]');
    expect(context?.querySelector('.inspector-context-kicker')?.textContent).toBe('Viewport');
    expect(context?.querySelector('.inspector-context-title')?.textContent).toBe('Tablet · 768');
    expect(context?.textContent).toContain('selected on stage');
  });
});
