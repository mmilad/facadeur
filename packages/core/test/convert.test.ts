import { describe, expect, it } from 'vitest';
import {
  DocumentError,
  toFlat,
  toNested,
  validateDocumentFile,
  type DocumentFile,
} from '@facadeur/core';

const sample: DocumentFile = {
  version: 1,
  id: 'hero',
  name: 'Hero',
  kind: 'component',
  fields: [
    { name: 'caption', type: 'text', default: 'Hello' },
    {
      name: 'kinds',
      type: 'array',
      items: { type: 'enum', options: ['quiet', 'loud'] },
      default: ['quiet'],
    },
  ],
  variants: [{ name: 'tone', values: ['quiet', 'loud'], default: 'quiet' }],
  settings: { artboard: { width: 800, height: 600 } },
  root: {
    id: 'root',
    type: 'frame',
    name: 'Hero frame',
    tag: 'section',
    attributes: { class: 'hero' },
    layout: {
      position: 'absolute',
      x: 1,
      y: 2,
      width: { mode: 'fixed', size: 100 },
      height: { mode: 'fixed', size: 80 },
    },
    style: { display: 'flex' },
    children: [
      {
        id: 'photo',
        type: 'image',
        tag: 'img',
        src: 'a.png',
        alt: 'A',
        bindings: [{ field: 'caption', target: 'alt' }],
      },
      {
        id: 'caption',
        type: 'text',
        tag: 'p',
        text: 'Hello',
        bindings: [{ field: 'caption', target: 'text' }],
      },
      {
        id: 'action',
        type: 'instance',
        name: 'Action',
        component: 'button',
        layout: { position: 'absolute', x: 8, y: 8 },
        fields: { label: 'Go' },
        variants: { tone: 'primary' },
        expose: {
          fields: { label: 'control.label' },
          events: { commit: 'control.commit' },
        },
      },
    ],
  },
};

describe('flat conversion', () => {
  it('stores nodes by id and children as ordered id lists', () => {
    const flat = toFlat(sample);
    expect(flat.rootId).toBe('root');
    expect(flat.nodes.root).toMatchObject({
      type: 'frame',
      children: ['photo', 'caption', 'action'],
    });
    expect(flat.nodes.photo).toMatchObject({ type: 'image', src: 'a.png', alt: 'A' });
    expect(flat.nodes.action).toMatchObject({
      type: 'instance',
      component: 'button',
      fields: { label: 'Go' },
      variants: { tone: 'primary' },
    });
    expect(flat.nodes.caption).not.toHaveProperty('children');
    expect(flat.nodes.action).not.toHaveProperty('children');
  });

  it('round-trips nested JSON without dropping fields', () => {
    expect(toNested(toFlat(sample))).toEqual(sample);
    const flat = toFlat(sample);
    expect(toFlat(toNested(flat))).toEqual(flat);
  });

  it('preserves an instance opt-out for automatic field forwarding', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'forward-fields',
      name: 'Forward fields',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'automatic', type: 'instance', component: 'control' },
          { id: 'explicit', type: 'instance', component: 'control', forwardFields: false },
        ],
      },
    };
    const flat = toFlat(file);

    expect(flat.nodes.automatic).not.toHaveProperty('forwardFields');
    expect(flat.nodes.explicit).toMatchObject({ forwardFields: false });
    expect(validateDocumentFile(file)).toEqual(file);
    expect(() =>
      validateDocumentFile({
        ...file,
        root: {
          id: 'root',
          type: 'frame',
          children: [
            { id: 'explicit', type: 'instance', component: 'control', forwardFields: 'no' },
          ],
        },
      }),
    ).toThrow(/must be boolean/);
    expect(toNested(flat)).toEqual(file);
    expect(toFlat(toNested(flat))).toEqual(flat);
  });

  it('omits empty collections on the way back to a file', () => {
    const flat = toFlat({
      version: 1,
      id: 'empty',
      name: 'Empty',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'div' },
    });
    expect(flat.nodes.root).toMatchObject({ type: 'frame', children: [] });
    expect(toNested(flat)).toEqual({
      version: 1,
      id: 'empty',
      name: 'Empty',
      kind: 'atom',
      root: { id: 'root', type: 'frame', tag: 'div' },
    });
  });

  it('rejects duplicate ids', () => {
    const file: DocumentFile = {
      version: 1,
      id: 'dup',
      name: 'Dup',
      kind: 'atom',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'same', type: 'text', text: 'a' },
          { id: 'same', type: 'text', text: 'b' },
        ],
      },
    };
    expect(() => toFlat(file)).toThrow(DocumentError);
  });

  it('rejects a cycle when expanding a flat document', () => {
    const flat = toFlat({
      version: 1,
      id: 'loop',
      name: 'Loop',
      kind: 'atom',
      root: { id: 'root', type: 'frame' },
    });
    const root = flat.nodes.root;
    if (root?.type !== 'frame') throw new Error('expected frame');
    root.children = ['root'];
    expect(() => toNested(flat)).toThrow(/Cycle/);
  });
});
