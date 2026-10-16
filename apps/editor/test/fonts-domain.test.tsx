/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog, exampleIds } from '@facadeur/examples';
import { fontFamilyTokens } from '@facadeur/core';
import { createAppService } from '../src/app-service';
import { createInMemoryCatalogPort } from '../src/domain/project/in-memory-catalog-port';
import { createEditorSession, type EditorSession } from '../src/domain/session';
import { FontsDomainPanel } from '../src/ui/design/FontsDomainPanel';

function FontsPanel({
  session,
  app,
}: {
  session: EditorSession;
  app: ReturnType<typeof createAppService>;
}) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return <FontsDomainPanel snap={snap} onEvent={(event) => void app.dispatchEditorEvent(event)} />;
}

describe('fonts domain panel', () => {
  let session: EditorSession | null = null;
  let app: ReturnType<typeof createAppService> | null = null;

  afterEach(() => {
    cleanup();
    session?.destroy();
    session = null;
    app = null;
  });

  function openFonts() {
    session = createEditorSession({ projectCatalog: createExampleCatalog() });
    app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session!.core.getSnapshot().catalog),
    });
    return render(<FontsPanel session={session} app={app} />);
  }

  it('adds a font with a valid id and default stack', () => {
    const view = openFonts();
    fireEvent.click(view.container.querySelector('button[name="add-font-trigger"]')!);
    fireEvent.change(document.querySelector('input[name="new-font-label"]')!, {
      target: { value: 'Display' },
    });
    fireEvent.click(document.querySelector('button[name="add-font"]')!);

    const display = fontFamilyTokens(session!.getSnapshot().design.tokens).find(
      (font) => font.label === 'Display',
    );
    expect(display?.value).toMatchObject({
      family: 'system-ui',
      fallbacks: ['sans-serif'],
      source: { type: 'system' },
    });
    expect(view.container.querySelector('input[name^="font-"][name$="-family"]')).toBeInstanceOf(
      HTMLInputElement,
    );
  });

  it('blocks removing a font that typography tokens still reference', () => {
    const view = openFonts();
    const uuid = exampleIds.tokens.font.systemUi;
    fireEvent.click(view.container.querySelector(`button[name="remove-font-${uuid}"]`)!);

    expect(
      fontFamilyTokens(session!.getSnapshot().design.tokens).map((font) => font.uuid),
    ).toContain(uuid);
    expect(session!.getSnapshot().notice?.tone).toBe('error');
    expect(session!.getSnapshot().notice?.text).toContain(uuid);
  });

  it('rejects fallbacks that do not end on a generic family', () => {
    const view = openFonts();
    const uuid = exampleIds.tokens.font.systemUi;
    fireEvent.click(view.container.querySelector(`button[name="font-details-${uuid}"]`)!);
    const fallbacks = view.container.querySelector<HTMLInputElement>(
      `input[name="font-${uuid}-fallbacks"]`,
    )!;
    fireEvent.change(fallbacks, { target: { value: 'Helvetica' } });
    fireEvent.blur(fallbacks);

    expect(
      fontFamilyTokens(session!.getSnapshot().design.tokens).find((font) => font.uuid === uuid)
        ?.value.fallbacks,
    ).toEqual(['sans-serif']);
    expect(session!.getSnapshot().notice?.tone).toBe('error');
    expect(session!.getSnapshot().notice?.text).toMatch(/generic family/i);
  });

  it('searches system source metadata and expands the compact detail row', () => {
    const view = openFonts();
    const uuid = exampleIds.tokens.font.systemUi;
    fireEvent.click(view.container.querySelector(`button[name="font-details-${uuid}"]`)!);
    fireEvent.change(view.container.querySelector('input[name="font-search"]')!, {
      target: { value: 'system' },
    });
    expect(view.container.querySelectorAll('.font-row')).toHaveLength(1);
    expect(view.container.textContent).toContain('System');

    fireEvent.click(view.container.querySelector(`button[name="font-details-${uuid}"]`)!);
    expect(view.container.querySelector(`input[name="font-${uuid}-fallbacks"]`)).toBeNull();
    expect(view.container.querySelector(`button[name="remove-font-${uuid}"]`)?.title).toBe(
      'Remove font System UI',
    );
  });
});
