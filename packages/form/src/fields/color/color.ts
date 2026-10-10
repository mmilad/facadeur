/** Public color value: normalized #RRGGBBAA (alpha FF when opaque). */
export type Rgba = { r: number; g: number; b: number; a: number };

export function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function clampAlpha(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function rgbaToHex({ r, g, b, a }: Rgba) {
  const alphaByte = Math.round(clampAlpha(a) * 255);
  const parts = [clampChannel(r), clampChannel(g), clampChannel(b), alphaByte]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');
  return `#${parts}`.toUpperCase();
}

export function normalizeHex(input: string) {
  const trimmed = input.trim();
  if (!trimmed.startsWith('#')) return null;
  const raw = trimmed.slice(1);
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}FF`;
  if (/^[0-9a-fA-F]{8}$/.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((char) => char + char)
      .join('')
      .toUpperCase()}FF`;
  }
  return null;
}

export function normalizeColor(input: string) {
  const fromHex = normalizeHex(input);
  if (fromHex) return fromHex;
  const rgbaMatch = input
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (!rgbaMatch) return '#000000FF';
  return rgbaToHex({
    r: Number(rgbaMatch[1]),
    g: Number(rgbaMatch[2]),
    b: Number(rgbaMatch[3]),
    a: rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]),
  });
}

export function hexToRgba(hex: string): Rgba | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const body = normalized.slice(1);
  return {
    r: Number.parseInt(body.slice(0, 2), 16),
    g: Number.parseInt(body.slice(2, 4), 16),
    b: Number.parseInt(body.slice(4, 6), 16),
    a: Number.parseInt(body.slice(6, 8), 16) / 255,
  };
}

export type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

export type WindowWithEyeDropper = Window & { EyeDropper?: EyeDropperConstructor };

function eyeDropperWindow() {
  return window as WindowWithEyeDropper;
}

export function supportsEyeDropper() {
  return typeof window !== 'undefined' && 'EyeDropper' in window;
}

export async function pickColorWithEyeDropper() {
  if (!supportsEyeDropper()) return null;
  const EyeDropper = eyeDropperWindow().EyeDropper;
  if (!EyeDropper) return null;
  return normalizeColor((await new EyeDropper().open()).sRGBHex);
}
