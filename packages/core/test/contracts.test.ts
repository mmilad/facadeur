import { describe, expect, it } from 'vitest';
import {
  eventDataMappings,
  eventDataSchema,
  validateCatalog,
  type DocumentFile,
} from '../src/index';

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

  it('rejects exposed fields and events that collide with direct members', () => {
    const invalidField = wrapper({
      fields: [{ name: 'value', type: 'text' }],
      expose: { fields: { value: 'control.value' } },
    });
    expect(() => validateCatalog([atom, invalidField])).toThrow(/collides with a direct field/);

    const invalidEvent = wrapper({
      events: [{ name: 'change' }],
      expose: { events: { change: 'control.change' } },
    });
    expect(() => validateCatalog([atom, invalidEvent])).toThrow(/collides with a direct event/);
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

  it('rejects repeat aliases that shadow fields or outer repeat aliases', () => {
    const fieldCollision: DocumentFile = {
      version: 1,
      id: 'repeat-field-alias-collision',
      name: 'Repeat field alias collision',
      kind: 'component',
      fields: [
        { name: 'items', type: 'array', items: { type: 'text' } },
        { name: 'item', type: 'text' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'div',
        repeat: { path: 'items' },
      },
    };
    expect(() => validateCatalog([fieldCollision])).toThrow(/shadows an existing data path/);

    const outerAliasCollision: DocumentFile = {
      version: 1,
      id: 'repeat-alias-collision',
      name: 'Repeat alias collision',
      kind: 'component',
      fields: [
        {
          name: 'sections',
          type: 'array',
          items: {
            type: 'object',
            fields: [{ name: 'rows', type: 'array', items: { type: 'text' } }],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'main',
        repeat: { path: 'sections', as: 'item' },
        children: [
          {
            id: 'rows',
            type: 'frame',
            repeat: { path: 'item.rows', as: 'item' },
          },
        ],
      },
    };
    expect(() => validateCatalog([outerAliasCollision])).toThrow(
      /Repeat alias "item".*shadows an existing data path/,
    );
  });

  it('does not expose a named variant contract for a default-only preset', () => {
    const card: DocumentFile = {
      version: 1,
      id: 'default-only-card',
      name: 'Default-only card',
      kind: 'component',
      variants: [{ name: 'default' }],
      root: { id: 'root', type: 'text', tag: 'span', text: 'Card' },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'default-only-host',
      name: 'Default-only host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'card', type: 'instance', component: 'default-only-card' }],
      },
    };

    expect(() => validateCatalog([host, card])).not.toThrow();
    const invalidHost: DocumentFile = {
      ...host,
      id: 'invalid-default-only-host',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'card',
            type: 'instance',
            component: 'default-only-card',
            variants: { variant: 'default' },
          },
        ],
      },
    };
    expect(() => validateCatalog([invalidHost, card])).toThrow(/unknown variant/);
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

  it('requires every required instance field and allows static preview overrides alongside bindings', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'required-instance-control',
      name: 'Required instance control',
      kind: 'atom',
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'hint', type: 'text' },
      ],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const missing: DocumentFile = {
      version: 1,
      id: 'missing-required-instance-field',
      name: 'Missing required instance field',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'control', type: 'instance', component: target.id }],
      },
    };
    expect(() => validateCatalog([missing, target])).toThrow(/missing required field "value"/);

    const conflict: DocumentFile = {
      ...missing,
      id: 'conflicting-instance-field',
      name: 'Conflicting instance field',
      fields: [{ name: 'source', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: target.id,
            fields: { value: 'Static' },
            fieldBindings: { value: 'source' },
          },
        ],
      },
    };
    expect(() => validateCatalog([conflict, target])).not.toThrow();
  });

  it('validates sparse child instance field overrides against nested contracts', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'child-field-control',
      name: 'Child field control',
      kind: 'atom',
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'placeholder', type: 'text' },
      ],
      root: { id: 'root', type: 'text', tag: 'input' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'child-field-owner',
      name: 'Child field owner',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: target.id,
            fields: { value: 'Default' },
          },
        ],
      },
    };
    const use: DocumentFile = {
      version: 1,
      id: 'child-field-use',
      name: 'Child field use',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'owner',
            type: 'instance',
            component: owner.id,
            fields: { value: 'Wrapped' },
            forwardFields: false,
            childFields: { control: { placeholder: 'Search' } },
          },
        ],
      },
    };
    expect(() => validateCatalog([use, owner, target])).not.toThrow();
    expect(() =>
      validateCatalog([
        {
          ...use,
          root: {
            ...use.root,
            children: [
              {
                ...(use.root as Extract<typeof use.root, { type: 'frame' }>).children![0],
                childFields: { control: { missing: 'x' } },
              },
            ],
          },
        },
        owner,
        target,
      ]),
    ).toThrow(/unknown child field/);
  });

  it('accepts child paths introduced by a target named variant when no variant is selected', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'variant-child-control',
      name: 'Variant child control',
      kind: 'atom',
      fields: [{ name: 'placeholder', type: 'text' }],
      root: { id: 'root', type: 'text', tag: 'input' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'variant-child-owner',
      name: 'Variant child owner',
      kind: 'component',
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            insertions: [
              {
                parent: 'root',
                node: { id: 'email', type: 'instance', component: target.id },
              },
            ],
          },
        },
      ],
      root: { id: 'root', type: 'frame' },
    };
    const use: DocumentFile = {
      version: 1,
      id: 'variant-child-use',
      name: 'Variant child use',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'owner',
            type: 'instance',
            component: owner.id,
            childFields: { email: { placeholder: 'Search' } },
          },
        ],
      },
    };
    expect(() => validateCatalog([use, owner, target])).not.toThrow();
  });

  it('rejects bindings with incompatible array item types', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'number-list-control',
      name: 'Number list control',
      kind: 'atom',
      fields: [{ name: 'values', type: 'array', items: { type: 'number' }, required: true }],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'text-list-owner',
      name: 'Text list owner',
      kind: 'component',
      fields: [{ name: 'values', type: 'array', items: { type: 'text' }, required: true }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'number-list-control',
            fieldBindings: { values: 'values' },
          },
        ],
      },
    };

    expect(() => validateCatalog([owner, target])).toThrow(/maps array to incompatible array/);
  });

  it('rejects structured and non-boolean direct node bindings', () => {
    const structured: DocumentFile = {
      version: 1,
      id: 'structured-binding',
      name: 'Structured binding',
      kind: 'component',
      fields: [
        {
          name: 'settings',
          type: 'object',
          items: { type: 'object', fields: [{ name: 'label', type: 'text' }] },
        },
      ],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'settings', target: 'text' }],
      },
    };
    expect(() => validateCatalog([structured])).toThrow(/cannot use structured field type/);

    const visibleText: DocumentFile = {
      version: 1,
      id: 'text-visibility-binding',
      name: 'Text visibility binding',
      kind: 'component',
      fields: [{ name: 'visible', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'visible', target: 'visible' }],
      },
    };
    expect(() => validateCatalog([visibleText])).toThrow(/needs a boolean field/);

    const variantBinding: DocumentFile = {
      version: 1,
      id: 'variant-structured-binding',
      name: 'Variant structured binding',
      kind: 'component',
      fields: [
        {
          name: 'settings',
          type: 'object',
          items: { type: 'object', fields: [{ name: 'label', type: 'text' }] },
        },
      ],
      variants: [
        {
          name: 'compact',
          overrides: {
            nodes: { root: { bindings: [{ field: 'settings', target: 'text' }] } },
          },
        },
      ],
      root: { id: 'root', type: 'text' },
    };
    expect(() => validateCatalog([variantBinding])).toThrow(/cannot use structured field type/);
  });

  it('rejects bindings with incompatible nested object fields', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'settings-control',
      name: 'Settings control',
      kind: 'atom',
      fields: [
        {
          name: 'settings',
          type: 'object',
          required: true,
          items: { type: 'object', fields: [{ name: 'enabled', type: 'boolean', required: true }] },
        },
      ],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'text-settings-owner',
      name: 'Text settings owner',
      kind: 'component',
      fields: [
        {
          name: 'settings',
          type: 'object',
          required: true,
          items: { type: 'object', fields: [{ name: 'enabled', type: 'text', required: true }] },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'settings-control',
            fieldBindings: { settings: 'settings' },
          },
        ],
      },
    };

    expect(() => validateCatalog([owner, target])).toThrow(/maps object to incompatible object/);
  });

  it('rejects bindings missing a nested required destination field', () => {
    const target: DocumentFile = {
      version: 1,
      id: 'required-settings-control',
      name: 'Required settings control',
      kind: 'atom',
      fields: [
        {
          name: 'settings',
          type: 'object',
          required: true,
          items: { type: 'object', fields: [{ name: 'label', type: 'text', required: true }] },
        },
      ],
      root: { id: 'root', type: 'text', tag: 'span' },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'empty-settings-owner',
      name: 'Empty settings owner',
      kind: 'component',
      fields: [
        {
          name: 'settings',
          type: 'object',
          required: true,
          items: { type: 'object', fields: [] },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'control',
            type: 'instance',
            component: 'required-settings-control',
            fieldBindings: { settings: 'settings' },
          },
        ],
      },
    };

    expect(() => validateCatalog([owner, target])).toThrow(/maps object to incompatible object/);
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

    const ambiguousDisplay: DocumentFile = {
      ...invalidDisplay,
      id: 'ambiguous-display-condition',
      root: {
        id: 'root',
        type: 'text',
        displayOn: { path: 'title', equals: 'Title', truthy: true },
      },
    };
    expect(() => validateCatalog([ambiguousDisplay])).toThrow();

    const emptyDisplay: DocumentFile = {
      ...invalidDisplay,
      id: 'empty-display-condition',
      root: {
        id: 'root',
        type: 'text',
        displayOn: { path: 'title' } as never,
      },
    };
    expect(() => validateCatalog([emptyDisplay])).toThrow();

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

  it('allows nested required fields to fall back to their own defaults', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'nested-default-field',
      name: 'Nested default field',
      kind: 'component',
      fields: [
        {
          name: 'settings',
          type: 'object',
          items: {
            type: 'object',
            fields: [{ name: 'mode', type: 'text', required: true, default: 'comfortable' }],
          },
          default: {},
        },
      ],
      root: { id: 'root', type: 'text', text: 'Settings' },
    };

    expect(() => validateCatalog([document])).not.toThrow();
  });

  it('validates enum array item options', () => {
    const invalid: DocumentFile = {
      version: 1,
      id: 'invalid-enum-array-item',
      name: 'Invalid enum array item',
      kind: 'component',
      fields: [
        {
          name: 'kinds',
          type: 'array',
          items: { type: 'enum', options: ['input', 'textarea'] },
          default: ['select'],
        },
      ],
      root: { id: 'root', type: 'text', text: 'Kinds' },
    };

    expect(() => validateCatalog([invalid])).toThrow(/kinds\[\].*one of input, textarea/);
  });

  it('rejects duplicate nested field names', () => {
    const invalid: DocumentFile = {
      version: 1,
      id: 'duplicate-nested-field',
      name: 'Duplicate nested field',
      kind: 'component',
      fields: [
        {
          name: 'record',
          type: 'object',
          items: {
            type: 'object',
            fields: [
              { name: 'value', type: 'text' },
              { name: 'value', type: 'number' },
            ],
          },
        },
      ],
      root: { id: 'root', type: 'text', text: 'Record' },
    };

    expect(() => validateCatalog([invalid])).toThrow(/Duplicate nested field "value"/);
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

  it('resolves declared event data and validates typed native, context and literal mappings', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'typed-event',
      name: 'Typed event',
      kind: 'atom',
      fields: [{ name: 'enabled', type: 'boolean', required: true }],
      events: [
        {
          name: 'commit',
          data: {
            fields: [
              { name: 'value', type: { kind: 'type', type: 'string' } },
              { name: 'enabled', type: { kind: 'type', type: 'boolean' } },
              { name: 'version', type: { kind: 'type', type: 'number' } },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'input',
        eventBindings: [
          {
            event: 'commit',
            name: 'change',
            data: [
              { path: 'value', source: { kind: 'native', path: 'currentTarget.value' } },
              { path: 'enabled', source: { kind: 'context', path: 'enabled' } },
              { path: 'version', source: { kind: 'literal', value: 1 } },
            ],
          },
        ],
        children: [],
      },
    };

    expect(eventDataSchema(document.events![0]!)).toEqual({
      type: 'object',
      properties: {
        value: { type: 'string' },
        enabled: { type: 'boolean' },
        version: { type: 'number' },
      },
      required: ['value', 'enabled', 'version'],
      additionalProperties: false,
    });
    expect(() => validateCatalog([document])).not.toThrow();
  });

  it('rejects missing or incompatible event data mappings', () => {
    const document: DocumentFile = {
      version: 1,
      id: 'invalid-event-mapping',
      name: 'Invalid event mapping',
      kind: 'atom',
      events: [{ name: 'commit', data: { direct: { kind: 'type', type: 'string' } } }],
      root: {
        id: 'root',
        type: 'text',
        eventBindings: [
          {
            event: 'commit',
            name: 'change',
            data: [{ path: '', source: { kind: 'native', path: 'currentTarget.checked' } }],
          },
        ],
      },
    };

    expect(() => validateCatalog([document])).toThrow(/incompatible/);
    expect(() =>
      validateCatalog([
        {
          ...document,
          root: {
            ...document.root,
            eventBindings: [{ event: 'commit', name: 'change', data: [] }],
          },
        },
      ]),
    ).toThrow(/must map its whole data value/);
  });

  it('validates nested event and context paths through named schemas', () => {
    const addressSchema = {
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
      additionalProperties: false,
    };
    const document: DocumentFile = {
      version: 1,
      id: 'nested-event-data',
      name: 'Nested event data',
      kind: 'atom',
      schemaCatalog: {
        schemas: [{ id: 'address', name: 'Address', schema: addressSchema }],
      },
      fields: [
        {
          name: 'contact',
          type: 'object',
          required: true,
          schema: { $ref: 'facadeur://schema/address' },
        },
      ],
      events: [
        {
          name: 'commit',
          data: {
            fields: [
              { name: 'contact', type: { kind: 'schema', schemaId: 'address' } },
              { name: 'address', type: { kind: 'schema', schemaId: 'address' } },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'text',
        eventBindings: [
          {
            event: 'commit',
            name: 'change',
            data: [
              { path: 'contact.city', source: { kind: 'context', path: 'contact.city' } },
              { path: 'address', source: { kind: 'context', path: 'contact' } },
            ],
          },
        ],
      },
    };

    expect(() => validateCatalog([document])).not.toThrow();
  });

  it('normalizes legacy event payload mappings to typed native sources', () => {
    const event = {
      name: 'commit',
      payload: { value: 'text' as const, enabled: 'boolean' as const, count: 'number' as const },
    };
    const binding = {
      event: 'commit',
      name: 'change',
      payload: {
        value: 'value' as const,
        enabled: 'checked' as const,
        count: 'valueAsNumber' as const,
      },
    };
    expect(eventDataMappings(event, binding)).toEqual([
      { path: 'value', source: { kind: 'native', path: 'currentTarget.value' } },
      { path: 'enabled', source: { kind: 'native', path: 'currentTarget.checked' } },
      { path: 'count', source: { kind: 'native', path: 'currentTarget.valueAsNumber' } },
    ]);
    expect(eventDataMappings(event, { event: 'commit', name: 'change' })).toEqual([
      { path: 'value', source: { kind: 'native', path: 'currentTarget.value' } },
      { path: 'enabled', source: { kind: 'native', path: 'currentTarget.checked' } },
      { path: 'count', source: { kind: 'native', path: 'currentTarget.valueAsNumber' } },
    ]);
  });
});
