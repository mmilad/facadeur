import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'facadeur.inspector.width';
export const INSPECTOR_WIDTH_DEFAULT = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 560;

function readStoredWidth(): number {
  if (typeof window === 'undefined') return INSPECTOR_WIDTH_DEFAULT;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return INSPECTOR_WIDTH_DEFAULT;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed));
}

export function useInspectorWidth() {
  const [width, setWidth] = useState(INSPECTOR_WIDTH_DEFAULT);

  useEffect(() => {
    setWidth(readStoredWidth());
  }, []);

  const persist = useCallback((next: number) => {
    const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next));
    setWidth(clamped);
    window.localStorage.setItem(STORAGE_KEY, String(clamped));
  }, []);

  return { width, persist, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH };
}
