import type { StyleBlock } from '../../schema/document.js';

/** Remove one named preset value, or the entire reserved axis after materializing a preset. */
export function removeNamedVariantLayer(styles: StyleBlock, name?: string) {
  removeFromOwner(styles, name);
  for (const child of Object.values(styles.children ?? {})) removeFromOwner(child, name);
  for (const rule of styles.rules ?? []) removeFromOwner(rule, name);
  if (styles.children) {
    for (const [id, child] of Object.entries(styles.children)) {
      if (!Object.keys(child).length) delete styles.children[id];
    }
    if (!Object.keys(styles.children).length) delete styles.children;
  }
}

function removeFromOwner(owner: { variants?: NonNullable<StyleBlock['variants']> }, name?: string) {
  const values = owner.variants?.variant;
  if (!values) return;
  if (name === undefined) delete owner.variants!.variant;
  else delete values[name];
  if (owner.variants?.variant && !Object.keys(owner.variants.variant).length) {
    delete owner.variants.variant;
  }
  if (owner.variants && !Object.keys(owner.variants).length) delete owner.variants;
}
