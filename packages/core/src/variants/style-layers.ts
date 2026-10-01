import type { StyleBlock } from '../document/schema.js';

/** Remove the reserved named-variant layer after materializing a preset. */
export function removeNamedVariantLayer(styles: StyleBlock): void {
  if (styles.variants?.variant) delete styles.variants.variant;
  if (styles.variants && !Object.keys(styles.variants).length) delete styles.variants;
  for (const child of Object.values(styles.children ?? {})) {
    if (child.variants?.variant) delete child.variants.variant;
    if (child.variants && !Object.keys(child.variants).length) delete child.variants;
  }
}
