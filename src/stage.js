/**
 * Fixed viewport over a stage positioned with CSS translate + scale.
 * Pan by dragging empty background. Zoom with the wheel, toward the cursor.
 * Content stays real DOM, so hit testing follows the transform.
 */

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;

export function createStage(viewport, stage) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  const listeners = new Set();
  const backgroundClicks = new Set();

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originTx = 0;
  let originTy = 0;

  function notify() {
    const state = { scale, tx, ty };
    for (const listener of listeners) listener(state);
  }

  function apply() {
    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    stage.style.setProperty('--stage-scale', String(scale));
    notify();
  }

  function setTransform(nextScale, nextTx, nextTy) {
    scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    tx = nextTx;
    ty = nextTy;
    apply();
  }

  function onWheel(event) {
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

  function onPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest('[data-id]')) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    originTx = tx;
    originTy = ty;
    viewport.classList.add('is-panning');
    viewport.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && Math.hypot(dx, dy) < 4) return;
    moved = true;
    tx = originTx + dx;
    ty = originTy + dy;
    apply();
  }

  function endDrag(event) {
    if (!dragging) return;
    const wasClick = !moved;
    dragging = false;
    viewport.classList.remove('is-panning');
    if (event?.pointerId != null && viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
    if (wasClick) {
      for (const listener of backgroundClicks) listener();
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
    setTransform,
    onChange(listener) {
      listeners.add(listener);
      listener({ scale, tx, ty });
      return () => listeners.delete(listener);
    },
    onBackgroundClick(listener) {
      backgroundClicks.add(listener);
      return () => backgroundClicks.delete(listener);
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
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
