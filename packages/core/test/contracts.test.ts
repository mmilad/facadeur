import { describe, expect, it } from 'vitest';
import { validateCatalog, type DocumentFile } from '../src/index.js';

const atom: DocumentFile = {
  version: 1,
  id: 'control',
  name: 'Control',
  kind: 'atom',
  fields: [{ name: 'value', type: 'text' }],
  events: [{ name: 'change', payload: { value: 'text' } }],
  root: { id: 'root', type: 'text', tag: 'span' },
};

function wrapper(overrides: Partial<DocumentFile> = {}): DocumentFile {
  return {
    version: 1,
    id: 'wrapper',
    name: 'Wrapper',
    kind: 'component',
    expose: {
      fields: { value: 'control.value' },
      events: { change: 'control.change' },
    },
    root: {
      id: 'root',
      type: 'frame',
      tag: 'label',
      children: [{ id: 'control', type: 'instance', component: 'control' }],
    },
    ...overrides,
  };
}

describe('component contracts', () => {
  it('validates exposed fields and events against nested child contracts', () => {
    expect(() => validateCatalog([atom, wrapper()])).not.toThrow();
  });

  it('rejects an exposed event that does not exist on the child', () => {
    const invalid = wrapper({ expose: { events: { change: 'control.commit' } } });
    expect(() => validateCatalog([atom, invalid])).toThrow(/does not resolve a child event/);
  });

  it('rejects an invalid exposed field path even when no instance override uses it', () => {
    const invalid = wrapper({ expose: { fields: { value: 'control.missing' } } });
    expect(() => validateCatalog([atom, invalid])).toThrow(/does not resolve a child field/);
  });

  it('does not treat repeated aliases to one child path as a cycle', () => {
    const aliases = wrapper({
      expose: {
        fields: { value: 'control.value', currentValue: 'control.value' },
        events: { change: 'control.change', changed: 'control.change' },
      },
    });
    expect(() => validateCatalog([atom, aliases])).not.toThrow();
  });

  it('validates repeat item scopes for conditions and instance field bindings', () => {
    const form: DocumentFile = {
      version: 1,
      id: 'form',
      name: 'Form',
      kind: 'component',
      fields: [
        {
          name: 'fields',
          type: 'array',
          items: {
            type: 'object',
            fields: [
              { name: 'id', type: 'text', required: true },
              { name: 'kind', type: 'text', required: true },
              { name: 'value', type: 'text' },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'form',
        repeat: { path: 'fields', as: 'field', key: 'id' },
        children: [
          {
            id: 'input',
            type: 'instance',
            component: 'control',
            displayOn: { path: 'field.kind', equals: 'input' },
            fieldBindings: { value: 'field.value' },
          },
        ],
      },
    };

    expect(() => validateCatalog([form, atom])).not.toThrow();
  });

  it('rejects unknown data paths and non-array repeat sources', () => {
    const invalid: DocumentFile = {
      version: 1,
      id: 'invalid-data',
      name: 'Invalid data',
      kind: 'component',
      fields: [{ name: 'title', type: 'text' }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        repeat: { path: 'title' },
        children: [{ id: 'label', type: 'text', displayOn: { path: 'missing', truthy: true } }],
      },
    };

    expect(() => validateCatalog([invalid])).toThrow(/must resolve to an array/);
    expect(() =>
      validateCatalog([
        {
          ...invalid,
          root: {
            id: 'root',
            type: 'frame',
            tag: 'div',
            children: [{ id: 'label', type: 'text', displayOn: { path: 'missing', truthy: true } }],
          },
        },
      ]),
    ).toThrow(/is not defined/);
  });

  it('validates data paths introduced by a variant overlay', () => {
    const invalid: DocumentFile = {
      version: 1,
      id: 'variant-data',
      name: 'Variant data',
      kind: 'component',
      fields: [{ name: 'title', type: 'text' }],
      variants: [
        {
          name: 'compact',
          overrides: {
            nodes: {
              label: { displayOn: { path: 'missing', truthy: true } },
            },
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        children: [{ id: 'label', type: 'text', text: 'Title' }],
      },
    };

    expect(() => validateCatalog([invalid])).toThrow(/is not defined/);
  });

  it('rejects field bindings whose source type does not match the child contract', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'number-control',
      name: 'Number control',
      kind: 'atom',
      fields: [{ name: 'value', type: 'number', required: true }],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'number-owner',
      name: 'Number owner',
      kind: 'component',
      fields: [{ name: 'label', type: 'text', default: 'Label' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'number-control',
            fieldBindings: { value: 'label' },
          },
        ],
      },
    };

    expect(() => validateCatalog([owner, target])).toThrow(/maps text to incompatible number/);
  });

  it('rejects optional sources bound to required child fields', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'required-control',
      name: 'Required control',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text', required: true }],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'optional-owner',
      name: 'Optional owner',
      kind: 'component',
      fields: [{ name: 'label', type: 'text' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'required-control',
            fieldBindings: { value: 'label' },
          },
        ],
      },
    };

    expect(() => validateCatalog([owner, target])).toThrow(/may be undefined/);
  });

  it('validates display comparisons and repeat keys semantically', () => {
    const invalidDisplay: DocumentFile = {
      version: 1,
      id: 'invalid-display-value',
      name: 'Invalid display value',
      kind: 'component',
      fields: [{ name: 'title', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        displayOn: { path: 'title', equals: 42 },
      },
    };
    expect(() => validateCatalog([invalidDisplay])).toThrow(/Display condition/);

    const invalidRepeatKey: DocumentFile = {
      version: 1,
      id: 'invalid-repeat-key',
      name: 'Invalid repeat key',
      kind: 'component',
      fields: [
        {
          name: 'items',
          type: 'array',
          items: {
            type: 'object',
            fields: [
              {
                name: 'meta',
                type: 'object',
                items: { type: 'object', fields: [{ name: 'label', type: 'text' }] },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'items', as: 'item', key: 'meta' },
      },
    };
    expect(() => validateCatalog([invalidRepeatKey])).toThrow(/must resolve to a scalar/);
  });

  it('validates primitive array item types', () => {
    const invalid: DocumentFile = {
      version: 1,
      id: 'invalid-array-item',
      name: 'Invalid array item',
      kind: 'component',
      fields: [
        {
          name: 'scores',
          type: 'array',
          items: { type: 'number' },
          default: ['not a number'],
        },
      ],
      root: { id: 'root', type: 'text', text: 'Scores' },
    };

    expect(() => validateCatalog([invalid])).toThrow(/scores\[\].*finite number/);
  });

  it('keeps structured semantic payloads separate from native event bindings', () => {
    const invalid: DocumentFile = {
      version: 1,
      id: 'structured-native-event',
      name: 'Structured native event',
      kind: 'atom',
      events: [{ name: 'commit', payload: { record: 'object' } }],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        eventBindings: [{ event: 'commit', name: 'change' }],
      },
    };

    expect(() => validateCatalog([invalid])).toThrow(/structured payload/);
  });
});
