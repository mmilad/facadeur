import { describe, expect, it } from 'vitest';
import {
  bindingFromSlot,
  slotForBinding,
  slotsForNode,
} from '../../src/ui/controls/data/binding-slots';

describe('binding slots', () => {
  it('offers value on input and maps it to attribute value', () => {
    const slots = slotsForNode('frame', 'input');
    const valueSlot = slots.find((slot) => slot.id === 'value');
    expect(valueSlot).toEqual({
      id: 'value',
      label: 'value',
      target: 'attribute',
      name: 'value',
    });
    expect(bindingFromSlot('Value', valueSlot!)).toEqual({
      field: 'Value',
      target: 'attribute',
      name: 'value',
    });
  });

  it('resolves a placeholder binding to the placeholder slot', () => {
    const slots = slotsForNode('frame', 'INPUT');
    const binding = { field: 'placeholder', target: 'attribute' as const, name: 'placeholder' };
    expect(slotForBinding(binding, slots).id).toBe('placeholder');
  });

  it('offers Text on text nodes and not value', () => {
    const slots = slotsForNode('text');
    expect(slots.some((slot) => slot.id === 'text' && slot.label === 'Text')).toBe(true);
    expect(slots.some((slot) => slot.id === 'value')).toBe(false);
  });

  it('offers src and alt on image nodes', () => {
    const slots = slotsForNode('image');
    expect(slots.map((slot) => slot.id)).toEqual(expect.arrayContaining(['src', 'alt']));
    expect(slots.some((slot) => slot.id === 'value')).toBe(false);
    expect(slots.filter((slot) => slot.target === 'attribute' && slot.name === 'src')).toHaveLength(
      0,
    );
  });

  it('offers video slots on image nodes tagged video', () => {
    const slots = slotsForNode('image', 'video');
    expect(slots.map((slot) => slot.id)).toEqual(
      expect.arrayContaining(['src', 'poster', 'style:custom']),
    );
    expect(slots.some((slot) => slot.id === 'alt')).toBe(false);
  });

  it('resolves attribute data-foo to the custom slot', () => {
    const slots = slotsForNode('frame', 'input');
    const binding = { field: 'meta', target: 'attribute' as const, name: 'data-foo' };
    expect(slotForBinding(binding, slots).id).toBe('attribute:custom');
  });
});
