import { describe, expect, it } from 'vitest';
import {
  automaticFieldGroupsFor,
  applyCommand,
  matchesSchemaValue,
  selectStructuralChild,
  documentClassNames,
  publicFieldsFor,
  structuralCaseValue,
  structuralChildSchemas,
  structuralNodeFields,
  structuralNodeSchema,
  structuralScopeFields,
  toFlat,
  toNested,
  validateCatalog,
  validateDocumentFile,
  type DocumentFile,
  type SchemaCatalog,
} from '@facadeur/core';

const card: DocumentFile = {
  version: 1,
  id: 'card',
  name: 'Card',
  kind: 'component',
  fields: [
    { name: 'kind', type: 'enum', options: ['card'], required: true },
    { name: 'title', type: 'text', required: true },
  ],
  root: { id: 'card-root', type: 'frame' },
};

const card2: DocumentFile = {
  version: 1,
  id: 'card2',
  name: 'Card 2',
  kind: 'section',
  fields: [
    { name: 'kind', type: 'enum', options: ['card2'], required: true },
    { name: 'count', type: 'number', required: true },
  ],
  root: { id: 'card2-root', type: 'frame' },
};

const list: DocumentFile = {
  version: 1,
  id: 'card-list',
  name: 'Card List',
  kind: 'component',
  root: {
    id: 'items-root',
    type: 'repeater',
    children: [
      {
        id: 'kind-switch',
        type: 'switch',
        children: [
          { id: 'card-branch', type: 'instance', component: card.id },
          { id: 'card2-branch', type: 'instance', component: card2.id },
        ],
      },
    ],
  },
};

describe('structural node contracts', () => {
  it.each(['repeater', 'switch'] as const)(
    'keeps %s alternative fields inside the fixed contract in nested and flat documents',
    (type: 'repeater' | 'switch') => {
      const structural: DocumentFile = {
        version: 1,
        id: `isolated-${type}`,
        name: 'Isolated alternatives',
        kind: 'component',
        root: {
          id: 'structure',
          type,
          children: [
            { id: 'card-choice', type: 'instance', component: card.id, forwardFields: true },
            { id: 'card2-choice', type: 'instance', component: card2.id, forwardFields: true },
          ],
        },
      };
      const owner: DocumentFile = {
        version: 1,
        id: `owner-${type}`,
        name: 'Owner',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'structure-instance', type: 'instance', component: structural.id }],
        },
      };
      const documents = [card, card2, structural, owner];
      const fixedField = type === 'repeater' ? 'items' : 'props';
      for (const flat of [false, true]) {
        const catalog = new Map(
          documents.map((document) => [document.id, flat ? toFlat(document) : document]),
        );
        const structureDocument = catalog.get(structural.id)!;
        expect([...publicFieldsFor(structureDocument, catalog).keys()]).toEqual([fixedField]);
        expect(automaticFieldGroupsFor(structureDocument, catalog)).toEqual([]);
        expect([...publicFieldsFor(catalog.get(owner.id)!, catalog).keys()]).toEqual([fixedField]);
        const schema = publicFieldsFor(structureDocument, catalog).get(fixedField)?.schema;
        const union = type === 'repeater' ? schema?.items : schema;
        expect(union?.anyOf).toMatchObject([
          {
            properties: {
              type: { const: 'card' },
              props: { properties: { title: { type: 'string' } } },
            },
          },
          {
            properties: {
              type: { const: 'card-2' },
              props: { properties: { count: { type: 'number' } } },
            },
          },
        ]);
      }
    },
  );

  it('derives an ordered heterogeneous array union and forwards it through components', () => {
    const owner: DocumentFile = {
      version: 1,
      id: 'owner',
      name: 'Owner',
      kind: 'component',
      root: {
        id: 'owner-root',
        type: 'frame',
        children: [{ id: 'list-instance', type: 'instance', component: list.id }],
      },
    };
    const files = [card, card2, list, owner];
    const catalog = new Map(files.map((document) => [document.id, document]));
    const schema = structuralNodeSchema(list, 'items-root', catalog);

    expect(schema).toMatchObject({
      type: 'array',
      items: {
        anyOf: [
          {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'card' },
              props: { type: 'object', properties: { kind: { type: 'string', enum: ['card'] } } },
            },
          },
          {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'card-2' },
              props: { type: 'object', properties: { kind: { type: 'string', enum: ['card2'] } } },
            },
          },
        ],
      },
    });
    const candidates = structuralChildSchemas(list, 'items-root', catalog);
    expect(candidates.map((entry) => entry.caseValue)).toEqual(['card', 'card-2']);
    expect(candidates.map((entry) => entry.path)).toEqual([
      ['kind-switch', 'card-branch'],
      ['kind-switch', 'card2-branch'],
    ]);
    expect(candidates[0]).toMatchObject({
      payloadSchema: { type: 'object', properties: { kind: { enum: ['card'] } } },
      schema: { properties: { type: { const: 'card' }, props: { type: 'object' } } },
    });
    expect(structuralNodeFields(list, catalog).get('items')).toMatchObject({ type: 'array' });
    expect([...documentClassNames(list).keys()]).toEqual([
      'items-root',
      'kind-switch',
      'card-branch',
      'card2-branch',
    ]);
    expect(publicFieldsFor(owner, catalog).get('items')?.schema).toEqual(
      structuralNodeFields(list, catalog).get('items')?.schema,
    );
    const values = [
      { type: 'card', props: { kind: 'card', title: 'A' } },
      { type: 'card-2', props: { kind: 'card2', count: 2 } },
    ];
    expect(matchesSchemaValue(values, schema!)).toBe(true);
    expect(matchesSchemaValue([{ kind: 'card', title: 'A' }], schema!)).toBe(false);
    expect(selectStructuralChild(values[0], candidates)).toMatchObject({
      index: 0,
      caseValue: 'card',
      legacy: false,
    });
    expect(selectStructuralChild({ type: 'unknown', props: {} }, candidates)).toBeUndefined();
    expect(selectStructuralChild({ kind: 'card', title: 'A' }, candidates)).toMatchObject({
      index: 0,
      legacy: true,
    });
  });

  it('keeps the fixed field for empty nodes and accepts preview values without a catalog', () => {
    const empty: DocumentFile = {
      version: 1,
      id: 'empty-list',
      name: 'Empty List',
      kind: 'component',
      previewData: { fields: { items: [] } },
      root: { id: 'empty-root', type: 'repeater' },
    };
    expect(structuralNodeFields(empty, new Map()).get('items')).toMatchObject({
      name: 'items',
      type: 'array',
      required: true,
    });
    expect(() => validateDocumentFile(empty)).not.toThrow();
    expect(toNested(toFlat(list))).toEqual(list);
  });

  it('uses stable discriminators, compatibility matching, and narrowed local scope fields', () => {
    const catalog = new Map([
      [card.id, card],
      [card2.id, card2],
      [list.id, list],
    ]);
    const candidates = structuralChildSchemas(list, 'items-root', catalog);
    const scope = structuralScopeFields(list, 'card-branch', catalog);
    const byName = new Map(scope.map((field) => [field.name, field]));
    const itemFields = byName.get('item')?.items?.fields;
    const propsFields = itemFields?.find((field) => field.name === 'props')?.items?.fields;

    expect(byName.get('index')?.schema).toEqual({ type: 'integer' });
    expect(itemFields?.map((field) => field.name)).toEqual(['type', 'props']);
    expect(propsFields?.map((field) => field.name)).toEqual(['kind', 'title']);
    expect(byName.get('props')?.items?.fields?.map((field) => field.name)).toEqual([
      'kind',
      'title',
    ]);
    expect(structuralCaseValue(list, candidates[0]!.node, catalog)).toBe('card');

    const direct = {
      ...list,
      root: {
        id: 'items-root',
        type: 'repeater' as const,
        children: [{ id: 'card-branch', type: 'instance' as const, component: card.id }],
      },
    };
    expect(
      structuralScopeFields(direct, 'card-branch', catalog)
        .find((field) => field.name === 'props')
        ?.items?.fields?.map((field) => field.name),
    ).toEqual(['kind', 'title']);
  });

  it('preserves lexical aliases through ordinary components and only pushes parent at a loop', () => {
    const catalog = new Map([
      [card.id, card],
      [card2.id, card2],
      [list.id, list],
    ]);
    const innerTarget: DocumentFile = {
      version: 1,
      id: 'inner-target',
      name: 'Inner Target',
      kind: 'component',
      fields: [{ name: 'innerTitle', type: 'text', required: true }],
      root: { id: 'inner-target-root', type: 'frame' },
    };
    catalog.set(innerTarget.id, innerTarget);
    const outer = structuralScopeFields(list, 'card-branch', catalog).filter((field) =>
      ['item', 'index', 'props'].includes(field.name),
    );
    const wrapper: DocumentFile = {
      version: 1,
      id: 'ordinary-wrapper',
      name: 'Ordinary Wrapper',
      kind: 'component',
      fields: [{ name: 'outerTitle', type: 'text', required: true }],
      root: {
        id: 'wrapper-root',
        type: 'frame',
        children: [
          {
            id: 'inner-card',
            type: 'instance',
            component: innerTarget.id,
            forwardFields: false,
          },
        ],
      },
    };
    catalog.set(wrapper.id, wrapper);
    const ordinary = structuralScopeFields(wrapper, 'inner-card', catalog, outer);
    expect(ordinary.map((field) => field.name)).toEqual(['outerTitle', 'item', 'index', 'props']);
    expect(
      ordinary.find((field) => field.name === 'props')?.items?.fields?.map((field) => field.name),
    ).toEqual(['outerTitle']);
    expect(ordinary.find((field) => field.name === 'item')?.schema).toMatchObject({
      properties: { type: { const: 'card' } },
    });
    expect(ordinary.some((field) => field.name === 'parent')).toBe(false);
    expect(
      structuralScopeFields(wrapper, 'wrapper-root', catalog, outer)
        .find((field) => field.name === 'props')
        ?.items?.fields?.map((field) => field.name),
    ).toEqual(['outerTitle']);

    const nested = {
      ...list,
      id: 'inner-list',
      root: {
        id: 'inner-repeater',
        type: 'repeater' as const,
        children: [{ id: 'inner-card', type: 'instance' as const, component: card.id }],
      },
    };
    const fields = structuralScopeFields(nested, 'inner-card', catalog, outer);
    expect(
      fields.find((field) => field.name === 'parent')?.items?.fields?.map((field) => field.name),
    ).toEqual(['item', 'index']);
  });

  it('validates ambient item, props, and index paths in reusable component masters', () => {
    const rowMaster: DocumentFile = {
      version: 1,
      id: 'row-master',
      name: 'Row Master',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', required: true }],
      root: {
        id: 'row-root',
        type: 'frame',
        children: [
          {
            id: 'probe-instance',
            type: 'instance',
            component: 'scope-probe',
            fieldBindings: {
              tag: 'item.type',
              title: 'props.title',
              index: 'index',
              outerTitle: 'parent.item.props.title',
            },
          },
        ],
      },
    };
    const probe: DocumentFile = {
      version: 1,
      id: 'scope-probe',
      name: 'Scope Probe',
      kind: 'atom',
      fields: [
        { name: 'tag', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'index', type: 'number', required: true },
        { name: 'outerTitle', type: 'text', required: true },
      ],
      root: { id: 'probe-root', type: 'text' },
    };
    expect(() => validateCatalog([rowMaster, probe])).not.toThrow();
  });

  it('rejects duplicate explicit discriminator values within an owner', () => {
    const duplicate: DocumentFile = {
      ...list,
      root: {
        id: 'items-root',
        type: 'repeater',
        children: [
          { id: 'card-a', type: 'instance', component: card.id, switchCase: 'card' },
          { id: 'card-b', type: 'instance', component: card.id, switchCase: 'card' },
        ],
      },
    };
    expect(() => validateCatalog([card, duplicate])).toThrow(
      /Structural case "card" is duplicated/,
    );
  });

  it('validates branch conditions and bindings against item and ambient parent scopes', () => {
    const scoped: DocumentFile = {
      ...list,
      root: {
        id: 'items-root',
        type: 'repeater',
        children: [
          {
            id: 'kind-switch',
            type: 'switch',
            children: [
              {
                id: 'card-branch',
                type: 'instance',
                component: card.id,
                displayOn: { path: 'item.type', truthy: true },
                fieldBindings: { title: 'parent.item.props.title' },
              },
              { id: 'card2-branch', type: 'instance', component: card2.id },
            ],
          },
        ],
      },
    };
    expect(() => validateCatalog([card, card2, scoped])).not.toThrow();
  });

  it('accepts legacy preview payloads but keeps unknown explicit cases invalid', () => {
    const legacy: DocumentFile = {
      ...list,
      previewData: { fields: { items: [{ kind: 'card', title: 'Legacy' }] } },
    };
    expect(() => validateCatalog([card, card2, legacy])).not.toThrow();
    const unknownCase: DocumentFile = {
      ...list,
      previewData: {
        fields: { items: [{ type: 'unknown', props: { kind: 'card', title: 'A' } }] },
      },
    };
    expect(() => validateCatalog([card, card2, unknownCase])).toThrow();
  });

  it('migrates typed preview envelopes atomically when a case changes', () => {
    const typed: DocumentFile = {
      ...list,
      variants: [{ name: 'featured', overrides: {} }],
      previewData: {
        fields: {
          items: [{ type: 'card', props: { kind: 'card', title: 'A' } }],
        },
        variants: {
          featured: {
            items: [{ type: 'card', props: { kind: 'card', title: 'B' } }],
          },
        },
      },
    };
    const catalog = new Map([
      [card.id, card],
      [card2.id, card2],
      [typed.id, typed],
    ]);
    const updated = applyCommand(
      toFlat(typed),
      { type: 'setProp', nodeId: 'card-branch', prop: 'switchCase', value: 'feature-card' },
      { schemaResolverContext: { documents: catalog } },
    );
    expect(updated.previewData?.fields?.items).toMatchObject([
      { type: 'feature-card', props: { title: 'A' } },
    ]);
    expect(updated.previewData?.variants?.featured?.items).toMatchObject([
      { type: 'feature-card', props: { title: 'B' } },
    ]);

    const switchOwner: DocumentFile = {
      ...typed,
      id: 'switch-owner',
      root: {
        id: 'switch-frame',
        type: 'frame',
        children: [
          {
            id: 'root-switch',
            type: 'switch',
            children: [{ id: 'switch-card', type: 'instance', component: card.id }],
          },
        ],
      },
      previewData: { fields: { props: { type: 'card', props: { kind: 'card', title: 'C' } } } },
    };
    const switchUpdated = applyCommand(
      toFlat(switchOwner),
      { type: 'setProp', nodeId: 'switch-card', prop: 'switchCase', value: 'root-card' },
      {
        schemaResolverContext: {
          documents: new Map([
            [card.id, card],
            [switchOwner.id, switchOwner],
          ]),
        },
      },
    );
    expect(switchUpdated.previewData?.fields?.props).toMatchObject({
      type: 'root-card',
      props: { title: 'C' },
    });
  });

  it('captures stable, unique default cases when instances are inserted', () => {
    const empty: DocumentFile = {
      version: 1,
      id: 'insert-list',
      name: 'Insert List',
      kind: 'component',
      root: { id: 'insert-root', type: 'repeater' },
    };
    const documents = new Map([
      [card.id, card],
      [empty.id, empty],
    ]);
    const context = { schemaResolverContext: { documents } };
    const one = applyCommand(
      toFlat(empty),
      {
        type: 'insert',
        parentId: 'insert-root',
        node: { id: 'first', type: 'instance', component: card.id },
      },
      context,
    );
    const two = applyCommand(
      one,
      {
        type: 'insert',
        parentId: 'insert-root',
        node: { id: 'second', type: 'instance', component: card.id },
      },
      context,
    );
    expect(two.nodes.first).toMatchObject({ switchCase: 'card' });
    expect(two.nodes.second).toMatchObject({ switchCase: 'card-2' });
  });

  it('forwards fixed contracts from structural nodes under nested frames', () => {
    const nestedList: DocumentFile = {
      ...list,
      id: 'nested-list',
      root: {
        id: 'outer-frame',
        type: 'frame',
        children: [
          {
            id: 'inner-frame',
            type: 'frame',
            children: [
              {
                id: 'nested-repeater',
                type: 'repeater',
                children: [
                  {
                    id: 'nested-switch',
                    type: 'switch',
                    children: [
                      { id: 'nested-card', type: 'instance', component: card.id },
                      { id: 'nested-card2', type: 'instance', component: card2.id },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const catalog = new Map([
      [card.id, card],
      [card2.id, card2],
      [nestedList.id, nestedList],
    ]);

    expect(structuralNodeFields(nestedList, catalog).get('items')?.schema).toMatchObject({
      type: 'array',
      items: { anyOf: [{ type: 'object' }, { type: 'object' }] },
    });
    expect([...publicFieldsFor(nestedList, catalog).keys()]).toEqual(['items']);
    expect([...publicFieldsFor(toFlat(nestedList), catalog).keys()]).toEqual(['items']);
    expect(automaticFieldGroupsFor(nestedList, catalog)).toEqual([]);
    const withSibling: DocumentFile = {
      ...nestedList,
      root: {
        ...nestedList.root,
        type: 'frame',
        children: [nestedList.root, { id: 'ordinary-card', type: 'instance', component: card.id }],
        id: 'sibling-root',
      },
    };
    expect(automaticFieldGroupsFor(withSibling, catalog).map((group) => group.instanceId)).toEqual([
      'ordinary-card',
    ]);
    expect([...publicFieldsFor(withSibling, catalog).keys()]).toEqual(['kind', 'title', 'items']);
  });

  it('preserves an authored JSON Schema union for child alternatives', () => {
    const unionCatalog: SchemaCatalog = {
      schemas: [
        {
          id: 'CardData',
          name: 'Card Data',
          schema: {
            oneOf: [
              {
                type: 'object',
                properties: { kind: { const: 'card' }, title: { type: 'string' } },
                required: ['kind', 'title'],
                additionalProperties: false,
              },
              {
                type: 'object',
                properties: { kind: { const: 'card2' }, count: { type: 'number' } },
                required: ['kind', 'count'],
                additionalProperties: false,
              },
            ],
          },
        },
      ],
    };
    const schemaCard: DocumentFile = {
      ...card,
      id: 'schema-card',
      schemaUse: { direct: { kind: 'schema', schemaId: 'CardData' } },
    };
    const schemaList: DocumentFile = {
      ...list,
      id: 'schema-list',
      root: {
        id: 'schema-root',
        type: 'repeater',
        children: [{ id: 'schema-card-instance', type: 'instance', component: schemaCard.id }],
      },
    };
    const catalog = new Map([
      [schemaCard.id, schemaCard],
      [schemaList.id, schemaList],
    ]);
    const schema = structuralNodeSchema(schemaList, 'schema-root', {
      documents: catalog,
      schemaCatalog: unionCatalog,
    });

    expect((schema?.items as { anyOf: Array<Record<string, unknown>> }).anyOf[0]).toMatchObject({
      properties: {
        type: { const: 'card' },
        props: {
          oneOf: [
            { required: ['kind', 'title'], additionalProperties: false },
            { required: ['kind', 'count'], additionalProperties: false },
          ],
        },
      },
    });
    expect(
      matchesSchemaValue([{ type: 'card', props: { kind: 'card', title: 'A' } }], schema!),
    ).toBe(true);
    expect(matchesSchemaValue([{ type: 'card', props: { kind: 'card', count: 2 } }], schema!)).toBe(
      false,
    );
  });

  it('derives structural payloads from a component’s complete exposed public contract', () => {
    const control: DocumentFile = {
      version: 1,
      id: 'input-control',
      name: 'Input Control',
      kind: 'atom',
      fields: [
        { name: 'value', type: 'text' },
        { name: 'placeholder', type: 'text' },
        { name: 'name', type: 'text' },
      ],
      root: { id: 'input-control-root', type: 'text' },
    };
    const input: DocumentFile = {
      version: 1,
      id: 'input-component',
      name: 'Input Component',
      kind: 'component',
      fields: [{ name: 'label', type: 'text', required: true }],
      expose: {
        fields: {
          value: 'control.value',
          placeholder: 'control.placeholder',
          name: 'control.name',
        },
      },
      root: {
        id: 'input-root',
        type: 'frame',
        children: [
          { id: 'control', type: 'instance', component: control.id, forwardFields: false },
        ],
      },
    };
    const inputList: DocumentFile = {
      version: 1,
      id: 'input-list',
      name: 'Input List',
      kind: 'component',
      root: {
        id: 'items',
        type: 'repeater',
        children: [{ id: 'row', type: 'instance', component: input.id }],
      },
    };
    const catalog = new Map([
      [control.id, control],
      [input.id, input],
      [inputList.id, inputList],
    ]);
    const [candidate] = structuralChildSchemas(inputList, 'items', catalog);
    expect(candidate?.payloadSchema.properties).toMatchObject({
      label: { type: 'string' },
      value: { type: 'string' },
      placeholder: { type: 'string' },
      name: { type: 'string' },
    });
    expect(publicFieldsFor(inputList, catalog).get('items')?.schema?.items).toMatchObject({
      anyOf: [
        {
          properties: {
            props: {
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
                placeholder: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
      ],
    });
  });

  it('rejects structural payload schema cycles after deriving full public fields', () => {
    const first: DocumentFile = {
      version: 1,
      id: 'first-loop',
      name: 'First Loop',
      kind: 'component',
      root: {
        id: 'first-root',
        type: 'repeater',
        children: [{ id: 'to-second', type: 'instance', component: 'second-loop' }],
      },
    };
    const second: DocumentFile = {
      version: 1,
      id: 'second-loop',
      name: 'Second Loop',
      kind: 'component',
      root: {
        id: 'second-root',
        type: 'repeater',
        children: [{ id: 'to-first', type: 'instance', component: first.id }],
      },
    };
    expect(() =>
      structuralChildSchemas(
        first,
        'first-root',
        new Map([
          [first.id, first],
          [second.id, second],
        ]),
      ),
    ).toThrow(/Structural contract cycle/);
  });

  it('rejects presentation properties on structural nodes', () => {
    expect(() =>
      validateDocumentFile({
        ...list,
        root: { id: 'bad-root', type: 'switch', style: { color: 'red' } },
      }),
    ).toThrow();
    expect(() => validateCatalog([card, card2, list])).not.toThrow();
  });
});
