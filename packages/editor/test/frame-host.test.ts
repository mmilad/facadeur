/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { createFrameHost } from '../src/frame-host.js';

describe('FrameHost', () => {
  it('exposes a same-origin document only after mount, and only through the host', () => {
    const host = createFrameHost({ id: 'mobile', width: 375 });
    expect(() => host.contentDocument()).toThrow(/no document/i);
    expect(host.element.style.width).toBe('375px');
    expect(host.element.style.pointerEvents).toBe('none');

    host.mount(document.body);
    const frameDocument = host.contentDocument();
    expect(frameDocument).toBe(host.element.contentDocument);
    expect(frameDocument.defaultView).toBe(host.contentWindow());
    expect(frameDocument.getElementById('facadeur-frame-shell')).not.toBeNull();
    expect(host.element.ownerDocument).toBe(document);

    host.setWidth(768);
    expect(host.element.style.width).toBe('768px');

    // jsdom does not lay out CSS heights, so the content box is stubbed.
    const block = frameDocument.createElement('div');
    block.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 240,
        bottom: 240,
        width: 240,
        height: 240,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    frameDocument.body.append(block);
    const height = host.syncHeight();
    expect(height).toBeGreaterThanOrEqual(240);
    expect(host.element.style.height).toBe(`${height}px`);

    host.destroy();
    expect(host.element.isConnected).toBe(false);
    expect(() => host.contentDocument()).toThrow(/no document/i);
  });
});
