/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import {
  hexToRgba,
  normalizeColor,
  rgbaToHex,
  supportsEyeDropper,
} from '../../src/ui/form/components/input/color.js';

describe('ColorInput color utils', () => {
  it('round-trips hex and rgba channels', () => {
    const hex = '#3D5A80CC';
    const rgba = hexToRgba(hex);
    expect(rgba).toEqual({ r: 61, g: 90, b: 128, a: 0.8 });
    expect(rgbaToHex(rgba!)).toBe(hex);
  });

  it('normalizes rgba() strings to #RRGGBBAA', () => {
    expect(normalizeColor('rgba(10, 20, 30, 0.5)')).toBe('#0A141E80');
  });

  it('reports eyedropper support based on the API', () => {
    const original = window.EyeDropper;
    window.EyeDropper = class {} as typeof EyeDropper;
    expect(supportsEyeDropper()).toBe(true);
    delete (window as { EyeDropper?: typeof EyeDropper }).EyeDropper;
    expect(supportsEyeDropper()).toBe(false);
    if (original) window.EyeDropper = original;
  });
});
