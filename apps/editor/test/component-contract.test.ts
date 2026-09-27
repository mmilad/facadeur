import { describe, expect, it } from 'vitest';
import { toFlat, type DocumentFile } from '@facadeur/core';
import { publicEventsFor, publicFieldsFor } from '../src/domain/component-contract.js';

function catalogOf(...files: DocumentFile[]) {
  return new Map(files.map((file) => [file.id, toFlat(file)]));
}

describe('component public contract', () => {
  it('includes direct and recursively exposed fields under their public names', () => {
    const atom: DocumentFile = {
      version: 1,
      id: 'control',
      name: 'Control',
      kind: 'atom',
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'placeholder', type: 'text', default: 'Value' },
      ],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const wrapper: DocumentFile = {
      version: 1,
      id: 'wrapper',
      name: 'Wrapper',
      kind: 'component',
      fields: [{ name: 'label', type: 'text', default: 'Label' }],
      expose: { fields: { value: 'control.value', placeholder: 'control.placeholder' } },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'label',
        children: [{ id: 'control', type: 'instance', component: 'control' }],
      },
    };

    const fields = publicFieldsFor(toFlat(wrapper), catalogOf(atom, wrapper));
    expect(fields.map((field) => field.name)).toEqual(['label', 'value', 'placeholder']);
    expect(fields.find((field) => field.name === 'value')).toMatchObject({
      type: 'text',
      required: true,
    });
  });

  it('follows expose mappings through another wrapper', () => {
    const atom: DocumentFile = {
      version: 1,
      id: 'control',
      name: 'Control',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text' }],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const inner: DocumentFile = {
      version: 1,
      id: 'inner',
      name: 'Inner',
      kind: 'component',
      expose: { fields: { content: 'control.value' } },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'label',
        children: [{ id: 'control', type: 'instance', component: 'control' }],
      },
    };
    const outer: DocumentFile = {
      version: 1,
      id: 'outer',
      name: 'Outer',
      kind: 'component',
      expose: { fields: { value: 'inner.content' } },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        children: [{ id: 'inner', type: 'instance', component: 'inner' }],
      },
    };

    const fields = publicFieldsFor(toFlat(outer), catalogOf(atom, inner, outer));
    expect(fields.map((field) => field.name)).toEqual(['value']);
    expect(fields[0]?.type).toBe('text');
  });

  it('includes direct and recursively exposed events under their public names', () => {
    const atom: DocumentFile = {
      version: 1,
      id: 'control',
      name: 'Control',
      kind: 'atom',
      events: [{ name: 'change', payload: { value: 'text' } }, { name: 'commit' }],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const wrapper: DocumentFile = {
      version: 1,
      id: 'wrapper',
      name: 'Wrapper',
      kind: 'component',
      events: [{ name: 'submit' }],
      expose: { events: { onChange: 'control.change', onCommit: 'control.commit' } },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'form',
        children: [{ id: 'control', type: 'instance', component: 'control' }],
      },
    };

    const events = publicEventsFor(toFlat(wrapper), catalogOf(atom, wrapper));
    expect(events.map((event) => event.name)).toEqual(['submit', 'onChange', 'onCommit']);
    expect(events.find((event) => event.name === 'onChange')).toMatchObject({
      payload: { value: 'text' },
    });
  });

  it('follows event expose mappings through another wrapper', () => {
    const atom: DocumentFile = {
      version: 1,
      id: 'control',
      name: 'Control',
      kind: 'atom',
      events: [{ name: 'change', payload: { value: 'text' } }],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const inner: DocumentFile = {
      version: 1,
      id: 'inner',
      name: 'Inner',
      kind: 'component',
      expose: { events: { changed: 'control.change' } },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'label',
        children: [{ id: 'control', type: 'instance', component: 'control' }],
      },
    };
    const outer: DocumentFile = {
      version: 1,
      id: 'outer',
      name: 'Outer',
      kind: 'component',
      expose: { events: { valueChanged: 'inner.changed' } },
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        children: [{ id: 'inner', type: 'instance', component: 'inner' }],
      },
    };

    const events = publicEventsFor(toFlat(outer), catalogOf(atom, inner, outer));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ name: 'valueChanged', payload: { value: 'text' } });
  });
});
