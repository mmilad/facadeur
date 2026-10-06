import type { Binding, BindingTarget } from '@facadeur/core';

export interface BindingSlot {
  id: string;
  label: string;
  target: BindingTarget;
  name?: string;
}

const VISIBILITY_SLOT: BindingSlot = {
  id: 'visible',
  label: 'Visibility',
  target: 'visible',
};

const STYLE_CUSTOM_SLOT: BindingSlot = {
  id: 'style:custom',
  label: 'Style property',
  target: 'style',
};

const ATTRIBUTE_CUSTOM_SLOT: BindingSlot = {
  id: 'attribute:custom',
  label: 'Custom attribute',
  target: 'attribute',
};

const TEXT_SLOT: BindingSlot = { id: 'text', label: 'Text', target: 'text' };

const SRC_SLOT: BindingSlot = { id: 'src', label: 'Image source', target: 'src' };

const ALT_SLOT: BindingSlot = { id: 'alt', label: 'Alt text', target: 'alt' };

function attributeSlot(name: string): BindingSlot {
  return { id: name, label: name, target: 'attribute', name };
}

function attributeSlots(names: string[]): BindingSlot[] {
  return names.map(attributeSlot);
}

function appendVisibilityStyleAndCustom(
  slots: BindingSlot[],
  includeStyle: boolean,
): BindingSlot[] {
  slots.push(VISIBILITY_SLOT);
  if (includeStyle) {
    slots.push(STYLE_CUSTOM_SLOT);
  }
  slots.push(ATTRIBUTE_CUSTOM_SLOT);
  return slots;
}

const INPUT_ATTRIBUTES = [
  'value',
  'placeholder',
  'name',
  'disabled',
  'checked',
  'type',
  'readonly',
  'required',
  'min',
  'max',
  'minlength',
  'maxlength',
  'step',
  'pattern',
  'inputmode',
  'autocomplete',
  'accept',
  'multiple',
] as const;

const TEXTAREA_ATTRIBUTES = [
  'value',
  'placeholder',
  'name',
  'disabled',
  'readonly',
  'required',
  'rows',
  'cols',
  'maxlength',
  'minlength',
  'autocomplete',
] as const;

const BUTTON_ATTRIBUTES = ['disabled', 'type', 'name', 'value'] as const;

const ANCHOR_ATTRIBUTES = ['href', 'target', 'rel', 'download'] as const;

const LABEL_ATTRIBUTES = ['for'] as const;

const GENERIC_FRAME_ATTRIBUTES = ['id', 'title', 'hidden', 'tabindex'] as const;

function slotsForFrameTag(tag: string | undefined): BindingSlot[] {
  const normalized = tag?.trim().toLowerCase() ?? '';

  switch (normalized) {
    case 'input':
      return appendVisibilityStyleAndCustom([...attributeSlots([...INPUT_ATTRIBUTES])], true);
    case 'select':
      return appendVisibilityStyleAndCustom(
        [
          { id: 'options', label: 'Options', target: 'options' },
          ...attributeSlots(['value', 'name', 'disabled', 'required', 'multiple']),
        ],
        true,
      );
    case 'textarea':
      return appendVisibilityStyleAndCustom([...attributeSlots([...TEXTAREA_ATTRIBUTES])], true);
    case 'button':
      return appendVisibilityStyleAndCustom([...attributeSlots([...BUTTON_ATTRIBUTES])], true);
    case 'a':
      return appendVisibilityStyleAndCustom([...attributeSlots([...ANCHOR_ATTRIBUTES])], true);
    case 'label':
      return appendVisibilityStyleAndCustom([...attributeSlots([...LABEL_ATTRIBUTES])], true);
    default:
      return appendVisibilityStyleAndCustom(
        [...attributeSlots([...GENERIC_FRAME_ATTRIBUTES])],
        true,
      );
  }
}

export function slotsForNode(nodeType: 'frame' | 'text' | 'image', tag?: string): BindingSlot[] {
  if (nodeType === 'text') {
    return [TEXT_SLOT, VISIBILITY_SLOT, ATTRIBUTE_CUSTOM_SLOT];
  }
  if (nodeType === 'image') {
    return [SRC_SLOT, ALT_SLOT, VISIBILITY_SLOT, ATTRIBUTE_CUSTOM_SLOT];
  }
  return slotsForFrameTag(tag);
}

function isNamelessTarget(target: BindingTarget): boolean {
  return (
    target === 'text' ||
    target === 'visible' ||
    target === 'src' ||
    target === 'alt' ||
    target === 'options'
  );
}

export function slotForBinding(binding: Binding, slots: BindingSlot[]): BindingSlot {
  if (isNamelessTarget(binding.target)) {
    const match = slots.find(
      (slot) => slot.target === binding.target && slot.id === binding.target,
    );
    if (match) return match;
  }

  if (binding.target === 'attribute' || binding.target === 'style') {
    const bindingName = binding.name?.toLowerCase();
    if (bindingName) {
      for (const slot of slots) {
        if (slot.id === 'attribute:custom' || slot.id === 'style:custom') continue;
        if (slot.target === binding.target && slot.name?.toLowerCase() === bindingName) {
          return slot;
        }
      }
    }
    if (binding.target === 'style') {
      return slots.find((slot) => slot.id === 'style:custom') ?? STYLE_CUSTOM_SLOT;
    }
    return slots.find((slot) => slot.id === 'attribute:custom') ?? ATTRIBUTE_CUSTOM_SLOT;
  }

  const fallback = slots.find((slot) => slot.target === binding.target);
  return fallback ?? ATTRIBUTE_CUSTOM_SLOT;
}

export function bindingFromSlot(field: string, slot: BindingSlot, customName?: string): Binding {
  if (slot.id === 'attribute:custom' || slot.id === 'style:custom') {
    const name = customName?.trim();
    return { field, target: slot.target, ...(name ? { name } : {}) };
  }
  if (isNamelessTarget(slot.target)) {
    return { field, target: slot.target };
  }
  if (slot.name) {
    return { field, target: slot.target, name: slot.name };
  }
  return { field, target: slot.target };
}
