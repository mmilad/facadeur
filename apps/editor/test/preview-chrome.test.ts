/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import button from '../../../examples/button.json';
import { documentToJson } from '../src/domain/assets/files';
import { createFrameHost } from '../src/domain/viewport/frame-host';
import { createEditorSession } from '../src/domain/session';
import {
  ASSET_PREVIEW_INNER_PADDING_PX,
  defaultViewportChrome,
  resolvedViewportChrome,
} from '../src/domain/viewport/viewport-chrome';
import { createViewportBoard } from '../src/domain/viewport/viewports';
import { createTestDocumentStore } from './controller-store.js';
import {
  editorStandardCatalog,
  editorStandardDesign,
  expandExampleCatalog,
} from './fixtures/example-catalog';

const documents = editorStandardCatalog();

describe('asset preview chrome', () => {
  it('defaults to zero padding for all document kinds', () => {
    expect(defaultViewportChrome('atom').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('component').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('section').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('page').innerPaddingPx).toBe(0);
  });

  it('ignores legacy preview inset without touching the document DSL or sizing', () => {
    const buttonDoc = expandExampleCatalog([button])[0]!;
    const store = createTestDocumentStore(buttonDoc);
    const parent = document.createElement('div');
    document.body.append(parent);
    const designDoc = editorStandardDesign();
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
    const beforeWidth = frame.host.element.style.width;
    const content = frame.host.contentDocument().querySelector<HTMLElement>('[data-node="root"]')!;
    const contentPadding = frame.host.contentWindow().getComputedStyle(content).padding;
    expect(contentPadding).not.toBe('0px');

    board.applyChrome(() => ({
      ...defaultViewportChrome('atom'),
      innerPaddingPx: 40,
      outerPaddingPx: 30,
      contentAlign: 'center',
    }));
    expect(frame.host.contentDocument().body.style.padding).toBe('0px');
    expect(frame.column.style.padding).toBe('0px');
    expect(frame.host.element.style.width).toBe(beforeWidth);
    expect(frame.host.contentDocument().body.style.alignItems).toBe('center');
    expect(frame.host.contentWindow().getComputedStyle(content).padding).toBe(contentPadding);
    expect(documentToJson(store.getDocument())).toBe(beforeJson);

    board.destroy();
    store.destroy();
    parent.remove();
  });

  it('keeps page previews unpadded by default', () => {
    const editor = createEditorSession({
      documents,
      design: editorStandardDesign(),
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
    expect(host.contentDocument().body.style.padding).toBe('0px');
    expect(host.contentDocument().body.style.boxSizing).toBe('border-box');
    host.setPreviewChrome({ innerPaddingPx: 0, contentAlign: 'center' });
    expect(host.contentDocument().body.style.padding).toBe('0px');
    expect(host.contentDocument().body.style.display).toBe('flex');
    host.destroy();
  });
});
