/**
 * Fixed viewport over a stage positioned with CSS translate + scale.
 * Pan by dragging, including over viewport frames. Zoom with the wheel, toward the cursor.
 * The dot grid is a viewport background locked to the same tx/ty/scale.
 */

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4;
/** Multiplicative step for toolbar zoom (+/-), ~10% per click. */
export const ZOOM_STEP_FACTOR = 1.1;
const GRID_BASE = 20;
const GRID_MIN_SCREEN = 14;
const GRID_MAX_SCREEN = 28;

export interface StageState {
  scale: number;
  tx: number;
  ty: number;
}

export interface StageController {
  getScale: () => number;
  /** True after the pointer has moved far enough to pan, until it is released. */
  isPanning: () => boolean;
  setTransform: (nextScale: number, nextTx: number, nextTy: number) => void;
  onChange: (listener: (state: StageState) => void) => () => void;
  /** A press that did not turn into a pan. The listener decides select versus clear. */
  onClick: (listener: (event: PointerEvent) => void) => () => void;
  /**
   * When this returns false, the press is not a pan. The stage does not capture
   * the pointer, so the editor can select, insert, or reorder.
   */
  setClaimsPan: (guard: (event: PointerEvent) => boolean) => void;
  fit: (element: HTMLElement, padding?: number) => void;
  /** Zoom toward the viewport center; factor > 1 zooms in. */
  zoomBy: (factor: number) => void;
  destroy: () => void;
}

export function createStage(viewport: HTMLElement, stage: HTMLElement): StageController {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const listeners = new Set<(state: StageState) => void>();
  const clicks = new Set<(event: PointerEvent) => void>();

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originTx = 0;
  let originTy = 0;
  let claimsPan: (event: PointerEvent) => boolean = () => true;

  function notify() {
    const state = { scale, tx, ty };
    for (const listener of listeners) listener(state);
  }

  function apply() {
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    stage.style.setProperty('--stage-scale', String(scale));
    paintGrid();
    notify();
  }

  function paintGrid() {
    const step = gridStep(scale);
    const size = step * scale;
    viewport.style.backgroundSize = `${size}px ${size}px`;
    viewport.style.backgroundPosition = `${tx - size / 2}px ${ty - size / 2}px`;
  }

  function setTransform(nextScale: number, nextTx: number, nextTy: number) {
    scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    tx = nextTx;
    ty = nextTy;
    apply();
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    if (event.deltaMode === 2) delta *= viewport.clientHeight;

    const nextScale = clamp(scale * Math.exp(-delta * 0.0015), MIN_SCALE, MAX_SCALE);
    const stageX = (mx - tx) / scale;
    const stageY = (my - ty) / scale;
    tx = mx - stageX * nextScale;
    ty = my - stageY * nextScale;
    scale = nextScale;
    apply();
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    if (!claimsPan(event)) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    originTx = tx;
    originTy = ty;
    viewport.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    viewport.classList.add('is-panning');
    tx = originTx + dx;
    ty = originTy + dy;
    apply();
  }

  function endDrag(event: PointerEvent) {
    if (!dragging) return;
    const wasClick = !moved;
    dragging = false;
    viewport.classList.remove('is-panning');
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    if (wasClick) {
      for (const listener of clicks) listener(event);
    }
  }

  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  apply();

  return {
    getScale() {
      return scale;
    },
    isPanning() {
      return dragging && moved;
    },
    setTransform,
    onChange(listener) {
      listeners.add(listener);
      listener({ scale, tx, ty });
      return () => listeners.delete(listener);
    },
    onClick(listener) {
      clicks.add(listener);
      return () => clicks.delete(listener);
    },
    setClaimsPan(guard) {
      claimsPan = guard;
    },
    destroy() {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', endDrag);
      viewport.removeEventListener('pointercancel', endDrag);
    },
    fit(element, padding = 72) {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      if (!vw || !vh || !width || !height) return;
      const pad = Math.min(padding, vw * 0.08, vh * 0.08);
      const nextScale = clamp(
        Math.min((vw - pad * 2) / width, (vh - pad * 2) / height),
        MIN_SCALE,
        1.25,
      );
      setTransform(nextScale, (vw - width * nextScale) / 2, (vh - height * nextScale) / 2);
    },
    zoomBy(factor) {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      if (!vw || !vh || factor <= 0) return;
      const mx = vw / 2;
      const my = vh / 2;
      const nextScale = clamp(scale * factor, MIN_SCALE, MAX_SCALE);
      const stageX = (mx - tx) / scale;
      const stageY = (my - ty) / scale;
      tx = mx - stageX * nextScale;
      ty = my - stageY * nextScale;
      scale = nextScale;
      apply();
    },
  };
}

function gridStep(scale: number): number {
  let step = GRID_BASE;
  let guard = 0;
  while (step * scale < GRID_MIN_SCREEN && guard < 8) {
    step *= 2;
    guard += 1;
  }
  guard = 0;
  while (step * scale > GRID_MAX_SCREEN && step > 5 && guard < 8) {
    step /= 2;
    guard += 1;
  }
  return step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
