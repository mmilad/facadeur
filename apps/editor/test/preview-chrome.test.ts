/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createFrameHost } from '../src/domain/viewport/frame-host';
import { createEditorSession } from '../src/domain/session';
import {
  ASSET_PREVIEW_INNER_PADDING_PX,
  defaultViewportChrome,
  resolvedViewportChrome,
} from '../src/domain/viewport/viewport-chrome';
import { editorStandardCatalog, editorStandardDesign } from './fixtures/example-catalog';
import { exampleIds as fixtureIds } from '@facadeur/examples';

const documents = editorStandardCatalog();

describe('asset preview chrome', () => {
  it('defaults to zero padding for all document kinds', () => {
    expect(defaultViewportChrome('atom').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('component').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('section').innerPaddingPx).toBe(ASSET_PREVIEW_INNER_PADDING_PX);
    expect(defaultViewportChrome('page').innerPaddingPx).toBe(0);
  });

  it('keeps page previews unpadded by default', () => {
    const editor = createEditorSession({
      documents,
      design: editorStandardDesign(),
    });
    const breakpoint = { uuid: fixtureIds.catalog.breakpoints.phone, label: 'Phone', minWidth: 375 };
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
    const host = createFrameHost({ id: fixtureIds.catalog.breakpoints.phone, width: 375 });
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
