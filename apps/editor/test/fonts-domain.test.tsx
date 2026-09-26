/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import textarea from '../../../examples/textarea.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';

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

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('fonts domain panel', () => {
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

  async function openFonts(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      (host!.querySelector('[data-design-domain="fonts"]') as HTMLButtonElement).click();
    });
  }

  it('adds a font with a valid id and default stack', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openFonts(session);

    const idInput = host!.querySelector('input[name="new-font-id"]') as HTMLInputElement;
    setInput(idInput, 'display');
    await act(async () => {
      (host!.querySelector('button[name="add-font"]') as HTMLButtonElement).click();
    });

    const snap = session.getSnapshot();
    expect(snap.design.fonts.map((font) => font.id)).toContain('display');
    const display = snap.design.fonts.find((font) => font.id === 'display');
    expect(display).toMatchObject({
      family: 'display',
      fallbacks: ['sans-serif'],
      source: { type: 'google', family: 'display' },
    });
    expect(host!.querySelector('input[name="font-display-family"]')).toBeInstanceOf(
      HTMLInputElement,
    );
  });

  it('blocks removing a font that typography tokens still reference', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openFonts(session);

    await act(async () => {
      (host!.querySelector('button[name="remove-font-sans"]') as HTMLButtonElement).click();
    });

    expect(session.getSnapshot().design.fonts.map((font) => font.id)).toContain('sans');
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/\{font\.sans\}/);
  });

  it('rejects fallbacks that do not end on a generic family', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openFonts(session);

    const fallbacks = host!.querySelector('input[name="font-sans-fallbacks"]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(fallbacks, { target: { value: 'Helvetica' } });
      fireEvent.blur(fallbacks);
    });

    expect(session.getSnapshot().design.fonts[0]?.fallbacks).toEqual(['system-ui', 'sans-serif']);
    expect(session.getSnapshot().notice?.tone).toBe('error');
    expect(session.getSnapshot().notice?.text).toMatch(/generic family/i);
  });
});
