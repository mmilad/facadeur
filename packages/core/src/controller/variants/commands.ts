import { DocumentError } from '../../document/errors.js';
import type { FlatDocument } from '../../document/flat.js';
import {
  isVariantAxis,
  type VariantAxis,
  type VariantPreset,
  type StyleBlock,
} from '../../schema/document.js';
import { omitVariantAxis, omitVariantValues } from '../style/blocks/edit.js';
import { parseStyleBlock } from '../style/blocks/parse.js';
import { removeNamedVariantLayer } from './style-layers.js';
import { assertVariantAxis, assertVariantPreset } from '../validation/assertions.js';
import type { Command } from '../document/commands/index.js';

export function defineVariant(doc: FlatDocument, axis: VariantAxis) {
  assertVariantAxis(axis);
  const previous = doc.variants.find(
    (item): item is VariantAxis => isVariantAxis(item) && item.name === axis.name,
  );
  const index = previous ? doc.variants.indexOf(previous) : -1;
  if (index === -1) doc.variants.push(axis);
  else doc.variants[index] = axis;
  if (!previous) return;
  const removed = previous.values.some((value) => !axis.values.includes(value));
  if (!removed) return;
  if (doc.styles) {
    const pruned = omitVariantValues(doc.styles, axis.name, new Set(axis.values));
    if (pruned) doc.styles = pruned;
    else delete doc.styles;
  }
  prunePresetStyles(doc, (styles) => omitVariantValues(styles, axis.name, new Set(axis.values)));
}

export function removeVariant(doc: FlatDocument, name: string) {
  const index = doc.variants.findIndex((item) => isVariantAxis(item) && item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-variant', `Variant "${name}" is not defined`);
  }
  doc.variants.splice(index, 1);
  if (doc.styles) {
    const pruned = omitVariantAxis(doc.styles, name);
    if (pruned) doc.styles = pruned;
    else delete doc.styles;
  }
  prunePresetStyles(doc, (styles) => omitVariantAxis(styles, name));
}

export function setVariantPreset(doc: FlatDocument, preset: VariantPreset) {
  assertVariantPreset(preset);
  const next = structuredClone(preset);
  const presets = doc.variantPresets ? [...doc.variantPresets] : [];
  const index = presets.findIndex((item) => item.name === next.name);
  if (index === -1) presets.push(next);
  else presets[index] = next;
  doc.variantPresets = presets;
  if (next.overrides?.styles && doc.styles) {
    const styles = structuredClone(doc.styles);
    removeNamedVariantLayer(styles, next.name);
    doc.styles = Object.keys(styles).length ? styles : undefined;
  }
}

export function setVariantStyleBlock(
  doc: FlatDocument,
  command: Extract<Command, { type: 'setVariantStyleBlock' }>,
) {
  const presets = doc.variantPresets ? [...doc.variantPresets] : [];
  const index = presets.findIndex((item) => item.name === command.name);
  if (index === -1) {
    throw new DocumentError('unknown-variant', `Variant preset "${command.name}" is not defined`);
  }
  const existing = presets[index];
  if (!existing) {
    throw new DocumentError('unknown-variant', `Variant preset "${command.name}" is not defined`);
  }
  const preset: VariantPreset = structuredClone(existing);
  const overrides = { ...(preset.overrides ?? {}) };
  if (command.style === null) delete overrides.styles;
  else overrides.styles = parseStyleBlock(command.style);
  if (Object.keys(overrides).length) preset.overrides = overrides;
  else delete preset.overrides;
  presets[index] = preset;
  doc.variantPresets = presets;
  if (doc.styles) {
    const styles = structuredClone(doc.styles);
    removeNamedVariantLayer(styles, command.name);
    doc.styles = Object.keys(styles).length ? styles : undefined;
  }
}

export function removeVariantPreset(doc: FlatDocument, name: string) {
  const presets = doc.variantPresets ?? [];
  const index = presets.findIndex((item) => item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-variant', `Variant preset "${name}" is not defined`);
  }
  presets.splice(index, 1);
  if (doc.variantLabels) delete doc.variantLabels[name];
  if (doc.previewData?.variants) delete doc.previewData.variants[name];
  if (doc.styles) removeNamedVariantLayer(doc.styles, name);
  prunePresetStyles(doc, (styles) => {
    const next = structuredClone(styles);
    removeNamedVariantLayer(next, name);
    return Object.keys(next).length ? next : undefined;
  });
  if (presets.length) doc.variantPresets = presets;
  else delete doc.variantPresets;
}

function prunePresetStyles(
  doc: FlatDocument,
  prune: (styles: StyleBlock) => StyleBlock | undefined,
) {
  for (const preset of doc.variantPresets ?? []) {
    const overrides = preset.overrides;
    if (!overrides?.styles) continue;
    const styles = prune(overrides.styles);
    if (styles) overrides.styles = styles;
    else delete overrides.styles;
    if (!Object.keys(overrides).length) delete preset.overrides;
  }
}
