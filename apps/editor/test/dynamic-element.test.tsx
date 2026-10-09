/** @vitest-environment jsdom */
import { cleanup, render } from '@testing-library/react';
import { emptyProjectCatalog, type ElementBuildConfig } from '@facadeur/core';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { DynamicElement } from '../src/domain/viewport/dynamic-element';
import { createViewportBoard } from '../src/domain/viewport/board';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let board: ReturnType<typeof createViewportBoard> | null = null;
let boardHost: HTMLDivElement | null = null;

afterEach(cleanup);
afterEach(async () => {
  if (board) await act(async () => board?.destroy());
  board = null;
  boardHost?.remove();
  boardHost = null;
});

describe('DynamicElement', () => {
  it('updates changed props while preserving a keyed void element', () => {
    const first: ElementBuildConfig = {
      tagName: 'img',
      nodeUuid: 'image-1',
      attributes: { src: '/first.png', alt: 'First image' },
      dataset: { previewMode: 'cover' },
      style: { 'object-fit': 'cover', width: '100%' },
      children: [{ tagName: 'span', text: 'ignored child' }],
    };
    const second: ElementBuildConfig = {
      ...first,
      attributes: { src: '/second.png', alt: 'Second image' },
    };
    const view = render(<DynamicElement config={first} />);
    const image = view.container.querySelector('img');

    expect(image).not.toBeNull();
    expect(image?.getAttribute('data-facadeur-node-uuid')).toBe('image-1');
    expect(image?.getAttribute('data-preview-mode')).toBe('cover');
    expect(image?.getAttribute('src')).toBe('/first.png');
    expect(view.container.textContent).toBe('');

    view.rerender(<DynamicElement config={second} />);

    expect(view.container.querySelector('img')).toBe(image);
    expect(image?.getAttribute('src')).toBe('/second.png');
    expect(image?.getAttribute('alt')).toBe('Second image');
  });

  it('renders children for non-void tags and applies DOM properties', () => {
    const config: ElementBuildConfig = {
      tagName: 'article',
      nodeUuid: 'article-1',
      text: 'Intro ',
      children: [{ tagName: 'span', nodeUuid: 'label-1', text: 'Label' }],
    };
    const view = render(<DynamicElement config={config} />);

    expect(view.container.querySelector('article')?.textContent).toBe('Intro Label');
    expect(view.container.querySelector('span')?.getAttribute('data-facadeur-node-uuid')).toBe(
      'label-1',
    );

    const inputConfig: ElementBuildConfig = {
      tagName: 'input',
      nodeUuid: 'input-1',
      properties: { value: 'before' },
    };
    const inputView = render(<DynamicElement config={inputConfig} />);
    const input = inputView.container.querySelector('input');
    expect(input?.value).toBe('before');
    inputView.rerender(
      <DynamicElement config={{ ...inputConfig, properties: { value: 'after' } }} />,
    );
    expect(input?.value).toBe('after');
  });

  it('updates bound text content without replacing the element', () => {
    const first: ElementBuildConfig = {
      tagName: 'h2',
      nodeUuid: 'bound-title',
      text: 'First title',
    };
    const view = render(<DynamicElement config={first} />);
    const heading = view.container.querySelector('h2');

    view.rerender(<DynamicElement config={{ ...first, text: 'Updated title' }} />);

    expect(view.container.querySelector('h2')).toBe(heading);
    expect(heading?.textContent).toBe('Updated title');
  });

  it('reconciles updates inside an iframe without replacing the element', async () => {
    boardHost = document.createElement('div');
    document.body.append(boardHost);
    const first: ElementBuildConfig = {
      tagName: 'img',
      nodeUuid: 'iframe-image',
      attributes: { src: '/first.png' },
    };
    await act(async () => {
      board = createViewportBoard({
        parent: boardHost!,
        buildConfig: first,
        title: 'Preview',
        catalog: emptyProjectCatalog(),
      });
    });
    const frameDocument = board!.frames()[0]!.host.contentDocument();
    expect(board!.frames()[0]!.host.element.style.pointerEvents).toBe('none');
    const image = frameDocument.querySelector('img');
    const next = { ...first, attributes: { src: '/next.png' } };
    await act(async () => board?.updateBuildConfig(next, 'Updated preview'));

    expect(frameDocument.querySelector('img')).toBe(image);
    expect(image?.getAttribute('src')).toBe('/next.png');
    expect(board!.frames()[0]!.host.element.title).toContain('Updated preview');
  });
});
