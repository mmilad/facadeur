/**
 * @vitest-environment jsdom
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { ClassConditionEditor } from '../src/ui/sidebar/right/components/ClassConditionEditor';

describe('ClassConditionEditor', () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    root = null;
    host = null;
  });

  it('keeps the apply toggle controlled and turns an empty group into a true condition', () => {
    const changes: unknown[] = [];
    let condition: Parameters<typeof ClassConditionEditor>[0]['condition'];
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const options = [{ value: '{state:open}', label: 'State: open', valueType: 'boolean' }];
    const renderEditor = () =>
      act(() =>
        root?.render(
          createElement(ClassConditionEditor, {
            condition,
            options,
            onChange: (next) => {
              changes.push(next);
              condition = next ?? undefined;
              renderEditor();
            },
          }),
        ),
      );
    renderEditor();
    const toggle = host.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    act(() => toggle.click());
    expect(changes.at(-1)).toEqual({
      kind: 'rule',
      operator: 'and',
      conditions: [
        {
          kind: 'condition',
          left: { kind: 'reference', reference: '{state:open}' },
          operator: 'is-set',
        },
      ],
    });
    act(() => (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
    expect((host.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false);
    expect(changes.at(-1)).toBeNull();
  });
});
