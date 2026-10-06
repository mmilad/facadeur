/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { renderDocument } from '../src/render';
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
        classes: ['hover:bg-blue-600'],
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
        children: [{ id: 'submit', type: 'instance', component: 'action', classes: ['w-full'] }],
      },
    };
    const parent = document.createElement('main');
    renderDocument(host, [host, action], parent, { paintRoot: true });

    const root = parent.querySelector('[data-component="host"]') as HTMLElement;
    const button = parent.querySelector('[data-component="action"]') as HTMLElement;
    const label = parent.querySelector('[data-node="label"]') as HTMLElement;
    expect(root.dataset.id).toBe('root');
    expect(root.classList.contains('host-root')).toBe(true);
    expect(root.dataset.styleNode).toBe('host:root');
    expect(button.dataset.styleNode).toBe('host:submit action:root');
    expect(button.dataset.styleDocument).toBe('host');
    expect(button.classList.contains('action-button')).toBe(true);
    expect(button.classList.contains('hover:bg-blue-600')).toBe(true);
    expect(button.classList.contains('w-full')).toBe(true);
    const changed = structuredClone(host);
    if (changed.root.type === 'frame' && changed.root.children?.[0]?.type === 'instance')
      changed.root.children[0].classes = ['flex'];
    renderDocument(changed, [changed, action], parent, { paintRoot: true });
    expect(button.classList.contains('w-full')).toBe(false);
    expect(button.classList.contains('flex')).toBe(true);
    expect(label.dataset.styleNode).toBe('action:label');
    expect(label.dataset.styleDocument).toBe('action');
  });
});
