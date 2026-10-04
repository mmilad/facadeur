import { describe, expect, it } from 'vitest';
import {
  automaticFieldGroupsFor,
  publicFieldsFor,
  toFlat,
  validateCatalog,
  type DocumentFile,
} from '@facadeur/core';

describe('public component fields', () => {
  it('forwards by default, honors opt-outs, and lets later extensions replace names', () => {
    const first: DocumentFile = {
      version: 1,
      id: 'first',
      name: 'First',
      kind: 'atom',
      fields: [
        { name: 'collision', type: 'text' },
        { name: 'firstOnly', type: 'boolean' },
        { name: 'optedOutOnly', type: 'text' },
      ],
      root: { id: 'root', type: 'text' },
    };
    const second: DocumentFile = {
      version: 1,
      id: 'second',
      name: 'Second',
      kind: 'atom',
      fields: [{ name: 'collision', type: 'number' }],
      root: { id: 'root', type: 'text' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'owner',
      name: 'Owner',
      kind: 'component',
      fields: [
        { name: 'collision', type: 'boolean' },
        { name: 'local', type: 'text' },
      ],
      expose: { fields: { alias: 'disabled.optedOutOnly' } },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'first', type: 'instance', component: first.id },
          { id: 'disabled', type: 'instance', component: first.id, forwardFields: false },
          { id: 'second', type: 'instance', component: second.id },
        ],
      },
    };
    const files = [first, second, owner];
    const nestedCatalog = new Map(files.map((document) => [document.id, document]));
    const flatCatalog = new Map(files.map((document) => [document.id, toFlat(document)]));

    for (const [document, catalog] of [
      [owner, nestedCatalog],
      [toFlat(owner), flatCatalog],
    ] as const) {
      const fields = publicFieldsFor(document, catalog);
      expect(fields.get('collision')).toMatchObject({ type: 'number' });
      expect(fields.has('firstOnly')).toBe(true);
      expect(fields.has('optedOutOnly')).toBe(true);
      expect(fields.get('alias')).toMatchObject({ name: 'alias', type: 'text' });
      expect(fields.get('local')).toMatchObject({ type: 'text' });
    }

    expect(automaticFieldGroupsFor(owner, nestedCatalog)).toMatchObject([
      { instanceId: 'first', componentId: 'first', componentName: 'First', enabled: true },
      { instanceId: 'disabled', componentId: 'first', componentName: 'First', enabled: false },
      { instanceId: 'second', componentId: 'second', componentName: 'Second', enabled: true },
    ]);
  });

  it('uses inherited fields for required checks and field binding validation', () => {
    const atom: DocumentFile = {
      version: 1,
      id: 'required-atom',
      name: 'Required atom',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text', required: true }],
      root: { id: 'root', type: 'text' },
    };
    const wrapper: DocumentFile = {
      version: 1,
      id: 'wrapper',
      name: 'Wrapper',
      kind: 'component',
      fields: [{ name: 'source', type: 'text', default: 'seed' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: atom.id,
            fieldBindings: { value: 'source' },
          },
        ],
      },
    };
    const missingRequired: DocumentFile = {
      version: 1,
      id: 'missing-required',
      name: 'Missing required',
      kind: 'page',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'wrapper', type: 'instance', component: wrapper.id }],
      },
    };
    expect(() => validateCatalog([atom, wrapper, missingRequired])).toThrow(
      /missing required field "value"/,
    );

    const validUse: DocumentFile = {
      ...missingRequired,
      id: 'valid-use',
      kind: 'component',
      fields: [{ name: 'input', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'wrapper',
            type: 'instance',
            component: wrapper.id,
            fieldBindings: { value: 'input' },
          },
        ],
      },
    };
    expect(() => validateCatalog([atom, wrapper, validUse])).not.toThrow();
  });

  it('does not publish child fields when automatic forwarding is disabled', () => {
    const atom: DocumentFile = {
      version: 1,
      id: 'private-atom',
      name: 'Private atom',
      kind: 'atom',
      fields: [{ name: 'privateValue', type: 'text' }],
      root: { id: 'root', type: 'text' },
    };
    const wrapper: DocumentFile = {
      version: 1,
      id: 'private-wrapper',
      name: 'Private wrapper',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: atom.id,
            forwardFields: false,
            fields: { privateValue: 'internal' },
          },
        ],
      },
    };
    const catalog = new Map([
      [atom.id, atom],
      [wrapper.id, wrapper],
    ]);
    expect(publicFieldsFor(wrapper, catalog)).toEqual(new Map());
  });
});
