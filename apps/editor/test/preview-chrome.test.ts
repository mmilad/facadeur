/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { exampleIds } from '@facadeur/examples';
import { createFrameHost } from '../src/domain/viewport/frame-host';

describe('FrameHost preview chrome', () => {
  it('keeps the iframe body unpadded by default', () => {
    const host = createFrameHost({ id: exampleIds.catalog.breakpoints.phone, width: 375 });
    host.mount(document.body);
    expect(host.contentDocument().body.style.padding).toBe('0px');
    expect(host.contentDocument().body.style.boxSizing).toBe('border-box');
    host.destroy();
  });
});
