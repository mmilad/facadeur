/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { renderDocument } from '../src/render.js';
import type { DocumentFile } from '@facadeur/core';

describe('preview style-name markers', () => {
  it('keeps node classes readable and tags instance roots for both owners', () => {
    const action: DocumentFile = {
      version: 1,
      id: 'action',
      name: 'Action',
      kind: 'atom',
      root: {
        id: 'root',
        type: 'frame',
        tag: 'button',
        styleName: 'action-button',
        children: [{ id: 'label', type: 'text', name: 'Button label' }],
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'host',
      name: 'Host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        styleName: 'host-root',
        children: [{ id: 'submit', type: 'instance', component: 'action' }],
      },
    };
    const parent = document.createElement('main');
    renderDocument(host, [host, action], parent, { paintRoot: true });

    const root = parent.querySelector('[data-component="host"]') as HTMLElement;
    const button = parent.querySelector('[data-component="action"]') as HTMLElement;
    const label = parent.querySelector('[data-node="label"]') as HTMLElement;
    expect(root.classList.contains('host-root')).toBe(true);
    expect(root.dataset.styleNode).toBe('host:root');
    expect(button.dataset.styleNode).toBe('host:submit action:root');
    expect(button.dataset.styleDocument).toBe('host');
    expect(button.classList.contains('action-button')).toBe(true);
    expect(label.dataset.styleNode).toBe('action:label');
    expect(label.dataset.styleDocument).toBe('action');
  });
});
