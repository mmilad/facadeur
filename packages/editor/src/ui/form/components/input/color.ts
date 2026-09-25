/** Public color value: normalized #RRGGBBAA (alpha FF when opaque). */

export type Rgba = { r: number; g: number; b: number; a: number };

export function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function clampAlpha(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function rgbaToHex({ r, g, b, a }: Rgba): string {
  const alpha = clampAlpha(a);
  const alphaByte = Math.round(alpha * 255);
  const parts = [clampChannel(r), clampChannel(g), clampChannel(b), alphaByte]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');
  return `#${parts}`.toUpperCase();
}

export function hexToRgba(hex: string): Rgba | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const body = normalized.slice(1);
  const r = Number.parseInt(body.slice(0, 2), 16);
  const g = Number.parseInt(body.slice(2, 4), 16);
  const b = Number.parseInt(body.slice(4, 6), 16);
  const a = body.length === 8 ? Number.parseInt(body.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a: clampAlpha(a) };
}

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('#')) return null;
  const raw = trimmed.slice(1);
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}FF`;
  }
  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .split('')
      .map((char) => char + char)
      .join('');
    return `#${expanded.toUpperCase()}FF`;
  }
  return null;
}

export function normalizeColor(input: string): string {
  const fromHex = normalizeHex(input);
  if (fromHex) return fromHex;
  const rgbaMatch = input
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (rgbaMatch) {
    return rgbaToHex({
      r: Number(rgbaMatch[1]),
      g: Number(rgbaMatch[2]),
      b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4]),
    });
  }
  return '#000000FF';
}

export function supportsEyeDropper(): boolean {
  return typeof window !== 'undefined' && 'EyeDropper' in window;
}

export async function pickColorWithEyeDropper(): Promise<string | null> {
  if (!supportsEyeDropper()) return null;
  const EyeDropperCtor = (
    window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }
  ).EyeDropper;
  const dropper = new EyeDropperCtor();
  const result = await dropper.open();
  return normalizeColor(result.sRGBHex);
}
