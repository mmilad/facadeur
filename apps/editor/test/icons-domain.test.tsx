/**
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import { afterEach, describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import { createEditorSession, type EditorSession } from '../src/domain/session.js';
import { App } from '../src/ui/shell/EditorShell.js';
import { expandExampleCatalog } from './fixtures/example-catalog.js';

const documents = expandExampleCatalog([button]);

describe('icons domain panel', () => {
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

  async function openIcons(session: EditorSession) {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root?.render(<App session={session} />);
    });
    await act(async () => {
      (host!.querySelector('[data-surface="icons"]') as HTMLButtonElement).click();
    });
  }

  it('selects a gallery icon and shows stable id and source details', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openIcons(session);

    const panel = host!.querySelector('.icons-domain-panel') as HTMLElement;
    const cards = panel.querySelectorAll<HTMLButtonElement>('.icon-card');
    expect(cards.length).toBeGreaterThan(1);
    expect(cards[0]?.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      cards[1]?.click();
    });

    expect(cards[1]?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('.icon-details')?.textContent).toContain('ID');
    expect(panel.querySelector('.icon-details')?.textContent).toContain('Source');
  });

  it('filters icons by category and keeps the panel read only', async () => {
    const session = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    await openIcons(session);

    const search = host!.querySelector('input[name="icon-search"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(search, 'controls');
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const panel = host!.querySelector('.icons-domain-panel') as HTMLElement;
    expect(panel.textContent).toContain('Chevron down');
    expect(
      [...panel.querySelectorAll('.icon-card strong')].map((item) => item.textContent),
    ).not.toContain('Select');
    expect(panel.querySelector('[data-save="design"]')).toBeNull();
    expect(panel.querySelector('.unsaved-indicator')).toBeNull();
  });
});
