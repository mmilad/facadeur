import type { FormDensity } from '../types/form.js';

export const DEFAULT_DENSITY: FormDensity = 'compact';

export function gapForDensity(density: FormDensity): string {
  return density === 'comfortable' ? 'var(--eu-gap-comfortable)' : 'var(--eu-gap-compact)';
}
