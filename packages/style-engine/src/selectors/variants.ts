import { cssString } from '../css/strings';

export function withVariant(selector: string, axis: string, value: string): string {
  const attribute =
    axis === 'variant'
      ? `[data-variant="${cssString(value)}"]`
      : `[data-variant-${axis}="${cssString(value)}"]`;
  const space = selector.indexOf(' ');
  if (space === -1) return `${selector}${attribute}`;
  return `${selector.slice(0, space)}${attribute}${selector.slice(space)}`;
}
