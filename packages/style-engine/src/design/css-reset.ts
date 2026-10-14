/** Baseline box model shared by Catalog previews and generated components. */
export function renderBoxSizingReset(): string {
  return `*,
*::before,
*::after {
  box-sizing: border-box;
}`;
}
