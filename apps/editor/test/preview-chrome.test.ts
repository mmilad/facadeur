/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { validateCatalog } from '@facadeur/core';
import { createProjectTemplateDocument } from '@facadeur/tokens';
import button from '../../../examples/button.json';
import card from '../../../examples/card.json';
import input from '../../../examples/input.json';
import link from '../../../examples/link.json';
import signIn from '../../../examples/sign-in.json';
import specimenPage from '../../../examples/specimen-page.json';
import specimenSection from '../../../examples/specimen-section.json';
import textarea from '../../../examples/textarea.json';
import { documentToJson } from '../src/domain/files.js';
import { createFrameHost } from '../src/domain/frame-host.js';
import { createEditorSession } from '../src/domain/session.js';
import {
  ASSET_PREVIEW_INNER_PADDING_PX,
  defaultViewportChrome,
  resolvedViewportChrome,
} from '../src/domain/viewport-chrome.js';
import { createViewportBoard } from '../src/domain/viewports.js';
import { createDocumentStore } from '@facadeur/store-yjs';

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

describe('asset preview chrome', () => {
  it('defaults inner padding for asset kinds only', () => {
    expect(defaultViewportChrome('atom').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('component').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('section').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('page').innerPaddingPx).toBe(0);
  });

  it('applies preview inset in the iframe without touching the document DSL', () => {
    const buttonDoc = validateCatalog([button])[0]!;
    const store = createDocumentStore(buttonDoc);
    const parent = document.createElement('div');
    document.body.append(parent);
    const designDoc = createProjectTemplateDocument();
    const board = createViewportBoard({
      parent,
      documents: [buttonDoc],
      page: buttonDoc,
      stores: [store],
      design: {
        breakpoints: designDoc.settings?.breakpoints ?? [],
        tokens: designDoc.tokens,
        fonts: designDoc.fonts,
      },
      paintRoot: true,
    });
    const frame = board.frames()[0]!;
    const beforeJson = documentToJson(store.getDocument());
    expect(frame.host.contentDocument().body.style.padding).toBe(
      `${ASSET_PREVIEW_INNER_PADDING_PX}px`,
    );

    board.applyChrome(() => ({
      ...defaultViewportChrome('atom'),
      innerPaddingPx: 40,
    }));
    expect(frame.host.contentDocument().body.style.padding).toBe('40px');
    expect(documentToJson(store.getDocument())).toBe(beforeJson);

    board.destroy();
    store.destroy();
    parent.remove();
  });

  it('keeps page previews unpadded by default', () => {
    const editor = createEditorSession({
      documents,
      design: createProjectTemplateDocument(),
    });
    const breakpoint = { id: 'mobile', minWidth: 375 };
    expect(
      resolvedViewportChrome(breakpoint, undefined, editor.getSnapshot().document.kind)
        .innerPaddingPx,
    ).toBe(0);
    editor.openAsset('button');
    expect(
      resolvedViewportChrome(breakpoint, undefined, editor.getSnapshot().document.kind)
        .innerPaddingPx,
    ).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
  });
});

describe('FrameHost preview chrome', () => {
  it('styles the iframe body and never serializes into exports', () => {
    const host = createFrameHost({ id: 'mobile', width: 375 });
    host.mount(document.body);
    host.setPreviewChrome({ innerPaddingPx: 24, contentAlign: 'start' });
    expect(host.contentDocument().body.style.padding).toBe('24px');
    expect(host.contentDocument().body.style.boxSizing).toBe('border-box');
    host.setPreviewChrome({ innerPaddingPx: 0, contentAlign: 'center' });
    expect(host.contentDocument().body.style.padding).toBe('');
    expect(host.contentDocument().body.style.display).toBe('flex');
    host.destroy();
  });
});
