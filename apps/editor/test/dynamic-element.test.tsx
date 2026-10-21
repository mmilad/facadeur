/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CoreController, emptyProjectCatalog, type ElementBuildConfig } from '@facadeur/core';
import { createPortal } from 'react-dom';
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DynamicElement } from '../src/domain/viewport/dynamic-element';
import { createViewportBoard } from '../src/domain/viewport/board';
import { previewDomEventOptions, reactEventPropFor } from '../src/domain/viewport/dom-events';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let board: ReturnType<typeof createViewportBoard> | null = null;
let boardHost: HTMLDivElement | null = null;

afterEach(async () => {
  await act(async () => cleanup());
  if (board) board.destroy();
  board = null;
  boardHost?.remove();
  boardHost = null;
});

describe('DynamicElement', () => {
  it('maps every authorable preview event to a React DOM event prop', () => {
    expect(previewDomEventOptions.every(([eventName]) => reactEventPropFor(eventName))).toBe(true);
  });

  it('sets up scoped repeater drag sources and accepts drops on repeater rows', () => {
    const behaviorHandler = vi.fn();
    const target = {
      scopeKey: 'instance',
      definitionUuid: 'definition',
      nodeUuid: 'row',
      events: ['dragstart', 'drop'],
      repeaterIndices: { repeater: 1 },
    };
    const view = render(
      <DynamicElement
        config={{ tagName: 'li', nodeUuid: 'row', behaviorTargets: [target] }}
        behaviorHandler={behaviorHandler}
        interactive
      />,
    );
    const row = view.container.querySelector('li')!;
    const setData = vi.fn();
    const transfer = { setData, getData: vi.fn(() => '{"repeater":1}') };

    expect(row.draggable).toBe(true);
    fireEvent.dragStart(row, { dataTransfer: transfer });
    expect(setData).toHaveBeenCalledWith('application/x-facadeur-repeater', '{"repeater":1}');
    const dragOver = new Event('dragover', { bubbles: true, cancelable: true });
    row.dispatchEvent(dragOver);
    expect(dragOver.defaultPrevented).toBe(true);
    fireEvent.drop(row, { dataTransfer: transfer });
    expect(behaviorHandler).toHaveBeenCalledWith(target, 'drop', expect.anything());
  });

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

  it('normalizes lowercase HTML autocomplete attributes for React', () => {
    const view = render(
      <DynamicElement config={{ tagName: 'input', attributes: { autocomplete: 'off' } }} />,
    );

    expect(view.container.querySelector('input')?.getAttribute('autocomplete')).toBe('off');
  });

  it('renders controlled form elements as inert canvas previews', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const inputView = render(
      <DynamicElement config={{ tagName: 'input', attributes: { value: 'Preview' } }} />,
    );
    const input = inputView.container.querySelector('input');
    expect(input?.readOnly).toBe(true);

    const textareaView = render(
      <DynamicElement config={{ tagName: 'textarea', attributes: { value: 'Preview' } }} />,
    );
    expect(textareaView.container.querySelector('textarea')?.readOnly).toBe(true);

    const selectView = render(
      <DynamicElement
        config={{
          tagName: 'select',
          attributes: { value: 'phone' },
          children: [{ tagName: 'option', attributes: { value: 'phone' }, text: 'Phone' }],
        }}
      />,
    );
    expect(selectView.container.querySelector('select')?.value).toBe('phone');

    const checkboxView = render(
      <DynamicElement
        config={{ tagName: 'input', attributes: { type: 'checkbox', checked: true } }}
      />,
    );
    expect(checkboxView.container.querySelector('input')?.checked).toBe(true);
    expect(error.mock.calls.flat().join(' ')).not.toContain('without an `onChange` handler');
    error.mockRestore();
  });

  it('keeps test-mode form edits local and keyed by rendered control', () => {
    const changes = vi.fn();
    const config: ElementBuildConfig = {
      kind: 'element',
      tagName: 'input',
      nodeUuid: 'search-input',
      attributes: { value: 'Initial' },
    };
    const view = render(<DynamicElement config={config} interactive onControlChange={changes} />);
    const input = view.container.querySelector('input')!;

    fireEvent.change(input, { target: { value: 'Typed' } });

    expect(changes).toHaveBeenCalledWith('search-input', { value: 'Typed' });
    view.rerender(
      <DynamicElement
        config={config}
        interactive
        controlValues={{ 'search-input': { value: 'Typed' } }}
        onControlChange={changes}
      />,
    );
    expect(input.value).toBe('Typed');
  });

  it('tracks checkable and selected values in test mode', () => {
    const changes = vi.fn();
    const checkboxView = render(
      <DynamicElement
        config={{ tagName: 'input', nodeUuid: 'enabled', attributes: { type: 'checkbox' } }}
        interactive
        onControlChange={changes}
      />,
    );
    fireEvent.click(checkboxView.container.querySelector('input')!);
    expect(changes).toHaveBeenLastCalledWith('enabled', { checked: true });

    const selectView = render(
      <DynamicElement
        config={{
          tagName: 'select',
          nodeUuid: 'device',
          properties: { value: 'phone' },
          children: [
            { tagName: 'option', attributes: { value: 'phone' }, text: 'Phone' },
            { tagName: 'option', attributes: { value: 'desktop' }, text: 'Desktop' },
          ],
        }}
        interactive
        onControlChange={changes}
      />,
    );
    fireEvent.change(selectView.container.querySelector('select')!, {
      target: { value: 'desktop' },
    });
    expect(changes).toHaveBeenLastCalledWith('device', { value: 'desktop' });
  });

  it('routes events to each scoped behavior target on the rendered element', () => {
    const handler = vi.fn();
    const config: ElementBuildConfig = {
      kind: 'element',
      tagName: 'div',
      nodeUuid: 'drop-target',
      behaviorTargets: [
        {
          scopeKey: 'parent/first',
          definitionUuid: 'definition-a',
          nodeUuid: 'drop-target',
          events: ['pointerenter', 'dragover'],
        },
        {
          scopeKey: 'parent/second',
          definitionUuid: 'definition-b',
          nodeUuid: 'drop-target',
          events: ['dragover'],
        },
      ],
    };
    const view = render(<DynamicElement config={config} behaviorHandler={handler} />);
    const target = view.container.querySelector('div')!;

    fireEvent.pointerEnter(target);
    fireEvent.dragOver(target);

    expect(
      handler.mock.calls.map(([behaviorTarget, eventName]) => [behaviorTarget.scopeKey, eventName]),
    ).toEqual([
      ['parent/first', 'pointerenter'],
      ['parent/first', 'dragover'],
      ['parent/second', 'dragover'],
    ]);
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
        title: 'Preview',
        breakpoints: new CoreController(emptyProjectCatalog()).getActiveBreakpoints(),
      });
    });
    const frameDocument = board!.frames()[0]!.host.contentDocument();
    expect(board!.frames()[0]!.host.element.style.pointerEvents).toBe('none');
    const target = frameDocument.body;
    const view = render(createPortal(<DynamicElement config={first} />, target));
    const image = frameDocument.querySelector('img');
    const next = { ...first, attributes: { src: '/next.png' } };
    await act(async () => {
      view.rerender(createPortal(<DynamicElement config={next} />, target));
    });
    board!.setTitle('Updated preview');

    expect(frameDocument.querySelector('img')).toBe(image);
    expect(image?.getAttribute('src')).toBe('/next.png');
    expect(board!.frames()[0]!.host.element.title).toContain('Updated preview');
  });
});
