/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { createExampleCatalog } from '@facadeur/examples';
import { createViewportBoard } from '../src/domain/viewport/board';

describe('ViewportBoard interaction mode', () => {
  let board: ReturnType<typeof createViewportBoard> | undefined;

  afterEach(() => {
    board?.destroy();
    board = undefined;
  });

  it('enables frame pointer input only while preview interactions are active', () => {
    const parent = document.createElement('div');
    document.body.append(parent);
    board = createViewportBoard({
      parent,
      title: 'Preview',
      breakpoints: createExampleCatalog().globalStyles?.breakpoints ?? [],
    });
    const frame = board.frames()[0]!;
    expect(frame.host.element.style.pointerEvents).toBe('none');
    board.setInteractionEnabled(true);
    expect(frame.host.element.style.pointerEvents).toBe('auto');
    board.setInteractionEnabled(false);
    expect(frame.host.element.style.pointerEvents).toBe('none');
  });
});
