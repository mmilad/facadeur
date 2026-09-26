/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { MAX_SCALE, MIN_SCALE, ZOOM_STEP_FACTOR, createStage } from '../src/domain/stage.js';

describe('stage zoomBy', () => {
  it('steps toward the viewport center and clamps scale', () => {
    const viewport = document.createElement('div');
    const stageEl = document.createElement('div');
    Object.defineProperty(viewport, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(viewport, 'clientHeight', { value: 600, configurable: true });
    document.body.append(viewport, stageEl);

    const stage = createStage(viewport, stageEl);
    expect(stage.getScale()).toBe(1);

    stage.zoomBy(ZOOM_STEP_FACTOR);
    expect(stage.getScale()).toBeCloseTo(ZOOM_STEP_FACTOR, 5);

    stage.setTransform(MAX_SCALE, 0, 0);
    stage.zoomBy(ZOOM_STEP_FACTOR);
    expect(stage.getScale()).toBe(MAX_SCALE);

    stage.setTransform(MIN_SCALE, 0, 0);
    stage.zoomBy(1 / ZOOM_STEP_FACTOR);
    expect(stage.getScale()).toBe(MIN_SCALE);

    stage.destroy();
    viewport.remove();
    stageEl.remove();
  });
});
