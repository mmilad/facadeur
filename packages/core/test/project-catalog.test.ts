import { describe, expect, it } from 'vitest';
import {
  DocumentError,
  executeComponentBehavior,
  emptyProjectCatalog,
  resolveDefinitionToElementBuildConfig,
  tokenReferenceValue,
  validateProjectCatalog,
} from '../src/index';
import { createExampleCatalog } from '@facadeur/examples';
import { patchNodeComposition } from '../src/controller/project/catalog/ops';
import {
  buildInspectorFormModel,
  inspectorChangeTarget,
} from '../src/controller/project/node/preview/inspector-view';
const testUuid25 = globalThis.crypto.randomUUID();
const testUuid26 = globalThis.crypto.randomUUID();
const testUuid27 = globalThis.crypto.randomUUID();

const imageSchemaUuid = testUuid25;
const imageAtomUuid = testUuid26;
const rootNodeUuid = testUuid27;

describe('validateProjectCatalog', () => {
  it('accepts empty catalog', () => {
    expect(validateProjectCatalog(emptyProjectCatalog())).toEqual({
      atoms: {},
      components: {},
      pages: {},
    });
  });

  it('accepts image atom with schema ref', () => {
    const catalog = validateProjectCatalog({
      atoms: {
        [imageAtomUuid]: {
          uuid: imageAtomUuid,
          name: 'Image',
          kind: 'atom',
          schema: { kind: 'ref', uuid: imageSchemaUuid },
          config: { previewData: { fields: { ratio: '16 / 9', src: '', alt: '' } } },
          root: {
            uuid: rootNodeUuid,
            dom: { tagName: 'img', attributes: { src: '', alt: '' } },
          },
        },
      },
      components: {},
      pages: {},
      schemas: {
        [imageSchemaUuid]: {
          type: 'object',
          required: ['src'],
          properties: {
            src: { type: 'string' },
            alt: { type: 'string' },
            ratio: { type: 'string' },
          },
        },
      },
    });
    expect(catalog.atoms[imageAtomUuid]?.name).toBe('Image');
  });

  it('accepts the shared UUID-keyed token model, including font-family tokens', () => {
    const catalog = validateProjectCatalog(createExampleCatalog());
    const colors = Object.values(catalog.tokens?.color ?? {});
    const fonts = Object.values(catalog.tokens?.font ?? {});

    expect(colors.length).toBeGreaterThan(0);
    expect(fonts.some((font) => font.valueType === 'fontFamily')).toBe(true);
    expect(catalog.icons?.map((icon) => icon.id)).toContain('select');
    for (const family of Object.values(catalog.tokens ?? {})) {
      for (const token of Object.values(family)) expect(token.uuid).toBeTruthy();
    }
  });

  it('rejects legacy token library shapes instead of migrating them in current Catalog validation', () => {
    const catalog = createExampleCatalog();
    expect(() =>
      validateProjectCatalog({
        ...catalog,
        tokens: {
          color: {
            blue: {
              $type: 'color',
              500: { $value: '#2563eb' },
            },
          },
        },
      }),
    ).toThrow('/tokens/');
    expect(() => validateProjectCatalog({ ...catalog, fonts: [] })).toThrow(/\/fonts\b/);
  });

  it('accepts global styles with breakpoints and a style block', () => {
    const exampleCatalog = createExampleCatalog();
    const accentTokenUuid = Object.values(exampleCatalog.tokens!.color).find(
      (token) => token.group === 'accent',
    )!.uuid;
    const catalog = validateProjectCatalog({
      ...exampleCatalog,
      globalStyles: {
        ...exampleCatalog.globalStyles,
        block: {
          declarations: { backgroundColor: tokenReferenceValue(accentTokenUuid) },
          rules: [
            {
              id: 'base-reset',
              selector: '*, *::before, *::after',
              bindings: {},
              declarations: { boxSizing: 'border-box' },
            },
          ],
        },
        tokenInterface: { reads: [accentTokenUuid] },
      },
    });
    expect(catalog.globalStyles?.block?.rules).toHaveLength(1);
    expect(catalog.globalStyles?.breakpoints).toEqual(exampleCatalog.globalStyles?.breakpoints);
  });

  it('validates optional project icon resources', () => {
    const base = createExampleCatalog();
    const catalog = validateProjectCatalog({
      ...base,
      icons: [
        ...(base.icons ?? []),
        {
          id: 'save',
          name: 'Save',
          category: 'actions',
          data: { viewBox: '0 0 24 24', paths: ['M2 2h20v20H2z'] },
        },
      ],
    });
    expect(catalog.icons).toContainEqual({
      id: 'save',
      name: 'Save',
      category: 'actions',
      data: { viewBox: '0 0 24 24', paths: ['M2 2h20v20H2z'] },
    });
    expect(() => validateProjectCatalog({ ...base, icons: [{ id: 'bad' }] })).toThrow(
      DocumentError,
    );
  });

  it('validates catalog icon references in schemas and field values', () => {
    const base = createExampleCatalog();
    const schemaUuid = globalThis.crypto.randomUUID();
    const componentUuid = globalThis.crypto.randomUUID();
    const rootUuid = globalThis.crypto.randomUUID();
    const icon = {
      id: 'save',
      name: 'Save',
      data: { viewBox: '0 0 24 24', paths: ['M2 2h20v20H2z'] },
    };
    const catalog = {
      ...base,
      schemas: {
        ...base.schemas,
        [schemaUuid]: {
          type: 'object',
          properties: {
            icon: {
              type: 'string',
              default: 'save',
              'x-facadeur-reference': { target: 'icon' },
            },
          },
        },
      },
      components: {
        ...base.components,
        [componentUuid]: {
          uuid: componentUuid,
          name: 'Icon button',
          kind: 'component' as const,
          schema: { kind: 'ref' as const, uuid: schemaUuid },
          root: { uuid: rootUuid, dom: { tagName: 'button' } },
          config: {
            previewData: { fields: { icon: 'save' } },
            staticFields: { icon: { isStatic: true, value: 'save' } },
          },
        },
      },
      icons: [...(base.icons ?? []).filter(({ id }) => id !== icon.id), icon],
    };

    const normalized = validateProjectCatalog(catalog);
    const definition = normalized.components[componentUuid]!;
    const inspector = buildInspectorFormModel(normalized, definition, rootUuid)!;
    const previewSection = inspector.fields.find(
      (field) => field.type === 'section' && field.title === 'Preview defaults',
    );
    const iconField =
      previewSection?.type === 'section'
        ? previewSection.fields.find(
            (field) => field.type === 'schemaField' && field.field.name === 'icon',
          )
        : undefined;
    expect(iconField?.type === 'schemaField' ? iconField.field.options : undefined).toContain(
      'save',
    );
    const configIconField = inspector.configFields.find((field) => field.field.name === 'icon');
    expect(configIconField?.field.schema.enum).toContain('save');
    expect(() =>
      validateProjectCatalog({
        ...catalog,
        components: {
          ...catalog.components,
          [componentUuid]: {
            ...catalog.components[componentUuid]!,
            config: { previewData: { fields: { icon: 'missing' } } },
          },
        },
      }),
    ).toThrow(/Unknown icon reference/);
    expect(() =>
      validateProjectCatalog({
        ...catalog,
        schemas: {
          ...catalog.schemas,
          [schemaUuid]: {
            type: 'object',
            properties: { icon: { type: 'string', 'x-facadeur-reference': { target: 'future' } } },
          },
        },
      }),
    ).toThrow(/Unknown catalog reference target/);
  });

  it('rejects missing schema ref', () => {
    expect(() =>
      validateProjectCatalog({
        atoms: {
          [imageAtomUuid]: {
            uuid: imageAtomUuid,
            name: 'Image',
            kind: 'atom',
            schema: { kind: 'ref', uuid: imageSchemaUuid },
            root: { uuid: rootNodeUuid, dom: { tagName: 'img' } },
          },
        },
        components: {},
        pages: {},
      }),
    ).toThrow(DocumentError);
  });

  it('validates component behavior references and operation arity', () => {
    const componentUuid = globalThis.crypto.randomUUID();
    const nodeUuid = globalThis.crypto.randomUUID();
    const makeCatalog = (behavior: unknown, classes?: unknown) => ({
      atoms: {},
      components: {
        [componentUuid]: {
          uuid: componentUuid,
          name: 'Button',
          kind: 'component',
          schema: {
            kind: 'inline',
            schema: { type: 'object', properties: { title: { type: 'string' }, onChange: {} } },
          },
          root: {
            uuid: nodeUuid,
            dom: { tagName: 'button' },
            ...(classes ? { classes } : {}),
          },
          ...(behavior === undefined ? {} : { behavior }),
        },
      },
      pages: {},
    });
    const behavior = {
      state: { open: false, count: 0, empty: null },
      transitions: [
        {
          nodeUuid,
          event: 'click',
          actions: [
            {
              kind: 'set-state',
              name: 'open',
              value: {
                kind: 'operation',
                operator: 'toggle',
                values: [{ kind: 'state', name: 'open' }],
              },
            },
            { kind: 'increment', name: 'count' },
            {
              kind: 'emit',
              name: 'change',
              args: [
                { kind: 'prop', path: 'title' },
                { kind: 'state-after-transition', name: 'open' },
              ],
            },
          ],
        },
      ],
    };
    const condition = (name: string) => [
      {
        name: 'is-open',
        condition: {
          kind: 'condition',
          left: { kind: 'reference', reference: `{state:${name}}` },
          operator: 'is-set',
        },
      },
    ];

    expect(() => validateProjectCatalog(makeCatalog(behavior, condition('open')))).not.toThrow();
    expect(() => validateProjectCatalog(makeCatalog(behavior, condition('missing')))).toThrow(
      /unknown behavior state "missing"/i,
    );
    expect(() => validateProjectCatalog(makeCatalog(undefined, condition('open')))).toThrow(
      /unknown behavior state "open"/i,
    );
    expect(() =>
      validateProjectCatalog(
        makeCatalog({
          ...behavior,
          transitions: [{ ...behavior.transitions[0]!, nodeUuid: globalThis.crypto.randomUUID() }],
        }),
      ),
    ).toThrow(/unknown node/i);
    expect(() =>
      validateProjectCatalog(
        makeCatalog({
          state: { open: false },
          transitions: [
            {
              nodeUuid,
              event: 'click',
              actions: [
                { kind: 'set-state', name: 'missing', value: { kind: 'literal', value: true } },
              ],
            },
          ],
        }),
      ),
    ).toThrow(/unknown state "missing"/i);
    expect(() =>
      validateProjectCatalog(
        makeCatalog({
          state: { count: 0 },
          transitions: [
            { nodeUuid, event: 'click', actions: [{ kind: 'increment', name: 'missing' }] },
          ],
        }),
      ),
    ).toThrow(/unknown state "missing"/i);
    expect(() =>
      validateProjectCatalog(
        makeCatalog({
          state: { open: false },
          transitions: [
            { nodeUuid, event: 'click', actions: [{ kind: 'increment', name: 'open' }] },
          ],
        }),
      ),
    ).toThrow(/non-numeric state "open"/i);
    expect(() =>
      validateProjectCatalog(
        makeCatalog({
          transitions: [
            { nodeUuid, event: 'click', actions: [{ kind: 'emit', name: 'save', args: [] }] },
          ],
        }),
      ),
    ).toThrow(/no matching callback prop/i);
    expect(() =>
      validateProjectCatalog(
        makeCatalog({
          transitions: [
            {
              nodeUuid,
              event: 'click',
              actions: [
                { kind: 'emit', name: 'change', args: [{ kind: 'prop', path: 'missing' }] },
              ],
            },
          ],
        }),
      ),
    ).toThrow(/unknown behavior prop "missing"/i);
    expect(() =>
      validateProjectCatalog(
        makeCatalog({
          state: { open: false },
          transitions: [
            {
              nodeUuid,
              event: 'click',
              actions: [
                {
                  kind: 'set-state',
                  name: 'open',
                  value: {
                    kind: 'operation',
                    operator: 'toggle',
                    values: [
                      { kind: 'state', name: 'open' },
                      { kind: 'literal', value: true },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow(/expects 1 value/i);
  });

  it('validates state-backed reorder actions against their repeater rows', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const buttonUuid = globalThis.crypto.randomUUID();
    Reflect.set(component.root, 'config', {
      composition: { kind: 'repeater', source: { kind: 'state', name: 'items' } },
    });
    Reflect.set(component.root.dom, 'children', [
      { uuid: buttonUuid, dom: { tagName: 'button', text: 'Move' } },
    ]);
    Reflect.set(component, 'behavior', {
      state: { items: ['Alpha', 'Bravo'] },
      stateSchema: { items: { type: 'array', items: { type: 'string' } } },
      transitions: [
        {
          nodeUuid: buttonUuid,
          event: 'click',
          actions: [
            {
              kind: 'move-array-item',
              name: 'items',
              repeaterUuid: component.root.uuid,
              direction: 'up',
            },
          ],
        },
      ],
    });

    expect(() => validateProjectCatalog(catalog)).not.toThrow();

    const behavior = component.behavior!;
    Reflect.set(component, 'behavior', {
      ...behavior,
      transitions: [{ ...behavior.transitions[0]!, nodeUuid: component.root.uuid }],
    });
    expect(() => validateProjectCatalog(catalog)).toThrow(/inside its Repeater/i);

    const withoutSchema = { ...behavior };
    Reflect.deleteProperty(withoutSchema, 'stateSchema');
    Reflect.set(component, 'behavior', withoutSchema);
    expect(() => validateProjectCatalog(catalog)).toThrow(/requires an explicit state schema/i);
  });

  it('allows appending from outside a Repeater and requires removal inside its rows', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const repeaterUuid = globalThis.crypto.randomUUID();
    const buttonUuid = globalThis.crypto.randomUUID();
    Reflect.set(component.root.dom, 'children', [
      {
        uuid: repeaterUuid,
        config: { composition: { kind: 'repeater', source: { kind: 'state', name: 'items' } } },
        dom: {
          tagName: 'ul',
          children: [{ uuid: globalThis.crypto.randomUUID(), dom: { tagName: 'li' } }],
        },
      },
      { uuid: buttonUuid, dom: { tagName: 'button' } },
    ]);
    const behavior = {
      state: { items: [{ id: 'first' }] },
      stateSchema: {
        items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' } } } },
      },
      stateArrayKeyPaths: { items: 'id' },
      transitions: [
        {
          nodeUuid: buttonUuid,
          event: 'click',
          actions: [{ kind: 'append-array-item' as const, name: 'items', repeaterUuid }],
        },
      ],
    };
    Reflect.set(component, 'behavior', behavior);
    expect(() => validateProjectCatalog(catalog)).not.toThrow();

    Reflect.set(component, 'behavior', {
      ...behavior,
      transitions: [
        {
          ...behavior.transitions[0],
          actions: [{ kind: 'remove-array-item' as const, name: 'items', repeaterUuid }],
        },
      ],
    });
    expect(() => validateProjectCatalog(catalog)).toThrow(/inside its Repeater/i);
  });

  it('requires configured stable item keys to be declared and unique', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    Reflect.set(component, 'behavior', {
      state: { items: [{ id: 'same' }, { id: 'same' }] },
      stateSchema: {
        items: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
      stateArrayKeyPaths: { items: 'id' },
      transitions: [],
    });
    expect(() => validateProjectCatalog(catalog)).toThrow(/unique, non-empty strings/i);

    Reflect.set(component, 'behavior', {
      ...component.behavior,
      state: { items: [{ id: 'first' }] },
      stateArrayKeyPaths: { items: 'missing' },
    });
    expect(() => validateProjectCatalog(catalog)).toThrow(/must name a string property/i);
  });
});

describe('executeComponentBehavior', () => {
  it('resolves component state references in preview text and attributes', () => {
    const catalog = createExampleCatalog();
    const definition = Object.values(catalog.components)[0]!;
    Reflect.set(definition, 'behavior', {
      state: { selected: 'Green' },
      transitions: [],
    });
    Reflect.set(definition.root.dom, 'text', '{state:selected}');
    Reflect.set(definition.root.dom, 'attributes', { 'aria-label': '{state:selected}' });
    Reflect.set(definition.root, 'classes', [
      {
        name: 'is-open',
        condition: {
          kind: 'condition',
          left: { kind: 'reference', reference: '{state:open}' },
          operator: 'equals',
          right: { kind: 'literal', value: true },
        },
        style: { declarations: { display: 'block' } },
      },
      {
        name: 'is-closed',
        condition: {
          kind: 'condition',
          left: { kind: 'reference', reference: '{state:open}' },
          operator: 'equals',
          right: { kind: 'literal', value: false },
        },
        style: { declarations: { display: 'none' } },
      },
    ]);
    Reflect.set(definition, 'behavior', {
      state: { selected: 'Green', open: false },
      transitions: [],
    });

    const preview = resolveDefinitionToElementBuildConfig(definition, catalog);
    const openPreview = resolveDefinitionToElementBuildConfig(
      definition,
      catalog,
      {},
      {
        behaviorStateByInstance: { [definition.uuid]: { selected: 'Green', open: true } },
      },
    );

    expect(preview.text).toBe('Green');
    expect(preview.attributes?.['aria-label']).toBe('Green');
    expect(preview.attributes?.class).toBe('is-closed');
    expect(openPreview.attributes?.class).toBe('is-open');
  });

  it('filters state-backed Repeater rows from a query state without renumbering the source', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const repeaterUuid = globalThis.crypto.randomUUID();
    const rowUuid = globalThis.crypto.randomUUID();
    const searchUuid = globalThis.crypto.randomUUID();
    Reflect.set(component.root.dom, 'children', [
      {
        uuid: searchUuid,
        dom: { tagName: 'input', attributes: { value: '{state:query}' } },
      },
      {
        uuid: repeaterUuid,
        config: {
          composition: {
            kind: 'repeater',
            source: { kind: 'state', name: 'options' },
            filter: { kind: 'contains', itemPath: 'label', queryState: 'query' },
          },
        },
        dom: {
          tagName: 'ul',
          children: [{ uuid: rowUuid, dom: { tagName: 'li', text: '{item:label}' } }],
        },
      },
    ]);
    Reflect.set(component, 'behavior', {
      state: {
        query: '',
        options: [
          { id: 'red', label: 'Red' },
          { id: 'green', label: 'Green' },
          { id: 'blue', label: 'Blue' },
        ],
      },
      stateSchema: {
        query: { type: 'string' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, label: { type: 'string' } },
          },
        },
      },
      stateArrayKeyPaths: { options: 'id' },
      transitions: [
        {
          nodeUuid: searchUuid,
          event: 'input',
          actions: [
            { kind: 'set-state', name: 'query', value: { kind: 'event', path: 'target.value' } },
          ],
        },
        { nodeUuid: rowUuid, event: 'click', actions: [] },
      ],
    });
    expect(() => validateProjectCatalog(catalog)).not.toThrow();

    const inspector = buildInspectorFormModel(catalog, component, repeaterUuid)!;
    const elementSection = inspector.fields.find(
      (field) => field.type === 'section' && field.title === 'Element',
    );
    const filterField =
      elementSection?.type === 'section'
        ? elementSection.fields.find(
            (field) => field.type === 'select' && field.path === 'node.compositionFilter',
          )
        : undefined;
    const filterValue = JSON.stringify({ queryState: 'query', itemPath: 'label' });
    expect(filterField?.type === 'select' ? filterField.options : []).toContainEqual({
      value: filterValue,
      label: 'query → label',
    });
    expect(inspector.formValue.node.compositionFilter).toBe(filterValue);
    expect(
      inspectorChangeTarget('node.compositionFilter', filterValue, repeaterUuid),
    ).toMatchObject({
      kind: 'nodeComposition',
      patch: { filter: { kind: 'contains', itemPath: 'label', queryState: 'query' } },
    });
    const clearedFilter = patchNodeComposition(catalog, component.uuid, repeaterUuid, {
      filter: null,
    });
    const clearedRepeater = clearedFilter.components[component.uuid]!.root.dom.children?.find(
      (node) => node.uuid === repeaterUuid,
    );
    expect(clearedRepeater?.config?.composition).toMatchObject({ kind: 'repeater' });
    expect(
      clearedRepeater?.config?.composition?.kind === 'repeater'
        ? clearedRepeater.config.composition.filter
        : undefined,
    ).toBeUndefined();
    const selectedFilter = patchNodeComposition(clearedFilter, component.uuid, repeaterUuid, {
      filter: { kind: 'contains', itemPath: 'label', queryState: 'query' },
    });
    const filteredRepeater = selectedFilter.components[component.uuid]!.root.dom.children?.find(
      (node) => node.uuid === repeaterUuid,
    );
    expect(
      filteredRepeater?.config?.composition?.kind === 'repeater'
        ? filteredRepeater.config.composition.filter
        : undefined,
    ).toEqual({ kind: 'contains', itemPath: 'label', queryState: 'query' });

    const emptyQuery = resolveDefinitionToElementBuildConfig(
      component,
      catalog,
      {},
      {
        includeBehaviorTargets: true,
      },
    );
    const searchResult = executeComponentBehavior(component.behavior, searchUuid, 'input', {
      state: component.behavior!.state!,
      event: { target: { value: 'REEN' } },
    });
    expect(searchResult.matched).toBe(true);
    const filtered = resolveDefinitionToElementBuildConfig(
      component,
      catalog,
      {},
      {
        includeBehaviorTargets: true,
        behaviorStateByInstance: { [component.uuid]: searchResult.state },
      },
    );
    const noMatchesResult = executeComponentBehavior(component.behavior, searchUuid, 'input', {
      state: searchResult.state,
      event: { target: { value: 'missing' } },
    });
    const noMatches = resolveDefinitionToElementBuildConfig(
      component,
      catalog,
      {},
      {
        behaviorStateByInstance: { [component.uuid]: noMatchesResult.state },
      },
    );
    const list = (build: typeof emptyQuery) =>
      build.children?.find((child) => child.kind === 'fragment');
    const rows = list(filtered)?.children ?? [];

    expect(list(emptyQuery)?.children?.map((row) => row.text)).toEqual(['Red', 'Green', 'Blue']);
    expect(rows.map((row) => row.text)).toEqual(['Green']);
    expect(rows[0]?.renderKey).toContain(':green:');
    const row = rows[0];
    expect(
      row && row.kind !== 'fragment'
        ? row.behaviorTargets?.[0]?.repeaterIndices?.[repeaterUuid]
        : undefined,
    ).toBe(1);
    expect(list(noMatches)?.children ?? []).toEqual([]);

    Reflect.set(component.behavior!.state!, 'query', 1);
    Reflect.set(component.behavior!, 'stateSchema', {
      ...component.behavior!.stateSchema,
      query: { type: 'number' },
    });
    expect(() => validateProjectCatalog(catalog)).toThrow(/Repeater filter.*string/i);
  });

  it('filters prop-backed Repeater rows and uses the selected id field as the row key', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const propId = globalThis.crypto.randomUUID();
    const rowUuid = globalThis.crypto.randomUUID();
    Reflect.set(component, 'schema', {
      kind: 'inline',
      schema: {
        type: 'object',
        properties: {
          options: {
            type: 'array',
            ['x-facadeur-prop-id']: propId,
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, label: { type: 'string' } },
            },
          },
        },
      },
    });
    const repeaterUuid = globalThis.crypto.randomUUID();
    Reflect.set(component.root.dom, 'children', [
      {
        uuid: repeaterUuid,
        config: {
          composition: {
            kind: 'repeater',
            source: { kind: 'prop', uuid: propId },
            keyPath: 'id',
            filter: { kind: 'contains', itemPath: 'label', queryState: 'query' },
          },
        },
        dom: {
          tagName: 'ul',
          children: [{ uuid: rowUuid, dom: { tagName: 'li', text: '{item:label}' } }],
        },
      },
    ]);
    Reflect.set(component, 'behavior', {
      state: { query: 'reen' },
      stateSchema: { query: { type: 'string' } },
      transitions: [],
    });
    expect(() => validateProjectCatalog(catalog)).not.toThrow();
    const inspector = buildInspectorFormModel(catalog, component, repeaterUuid)!;
    const elementSection = inspector.fields.find(
      (field) => field.type === 'section' && field.title === 'Element',
    );
    const keyField =
      elementSection?.type === 'section'
        ? elementSection.fields.find(
            (field) => field.type === 'select' && field.path === 'node.compositionKeyPath',
          )
        : undefined;
    expect(keyField?.type === 'select' ? keyField.options : []).toContainEqual({
      value: 'id',
      label: 'id',
    });
    expect(inspectorChangeTarget('node.compositionKeyPath', 'id', repeaterUuid)).toMatchObject({
      kind: 'nodeComposition',
      patch: { keyPath: 'id' },
    });
    const preview = resolveDefinitionToElementBuildConfig(component, catalog, {
      options: [
        { id: 'red', label: 'Red' },
        { id: 'green', label: 'Green' },
      ],
    });
    const rows = preview.children?.find((child) => child.kind === 'fragment')?.children ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe('Green');
    expect(rows[0]?.renderKey).toContain(':green:');
  });

  it('resolves an item-backed nested Repeater with filtered stable option IDs', () => {
    const catalog = createExampleCatalog();
    const component = Object.values(catalog.components)[0]!;
    const groupsPropId = globalThis.crypto.randomUUID();
    const groupRepeaterUuid = globalThis.crypto.randomUUID();
    const optionRepeaterUuid = globalThis.crypto.randomUUID();
    const rowUuid = globalThis.crypto.randomUUID();
    Reflect.set(component, 'schema', {
      kind: 'inline',
      schema: {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            ['x-facadeur-prop-id']: groupsPropId,
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: { id: { type: 'string' }, label: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    });
    Reflect.set(component.root.dom, 'children', [
      {
        uuid: groupRepeaterUuid,
        config: {
          composition: {
            kind: 'repeater',
            source: { kind: 'prop', uuid: groupsPropId },
            keyPath: 'id',
          },
        },
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: optionRepeaterUuid,
              config: {
                composition: {
                  kind: 'repeater',
                  source: { kind: 'item', path: 'options' },
                  keyPath: 'id',
                  filter: { kind: 'contains', itemPath: 'label', queryState: 'query' },
                },
              },
              dom: {
                tagName: 'ul',
                children: [{ uuid: rowUuid, dom: { tagName: 'li', text: '{item:label}' } }],
              },
            },
          ],
        },
      },
    ]);
    Reflect.set(component, 'behavior', {
      state: { query: 'reen' },
      stateSchema: { query: { type: 'string' } },
      transitions: [],
    });
    expect(() => validateProjectCatalog(catalog)).not.toThrow();
    const preview = resolveDefinitionToElementBuildConfig(component, catalog, {
      groups: [
        {
          id: 'group-a',
          options: [
            { id: 'red', label: 'Red' },
            { id: 'green', label: 'Green' },
          ],
        },
        { id: 'group-b', options: [{ id: 'blue', label: 'Blue' }] },
      ],
    });
    const findRows = (node: NonNullable<typeof preview>): NonNullable<typeof preview>[] => [
      node,
      ...(node.children ?? []).flatMap(findRows),
    ];
    const rows = findRows(preview).filter((node) => node.text === 'Green');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.renderKey).toContain(':green:');
  });

  it('moves an array item using the active repeater index without mutating input state', () => {
    const repeaterUuid = globalThis.crypto.randomUUID();
    const behavior = {
      state: { items: ['first', 'second', 'third'] },
      transitions: [
        {
          nodeUuid: rootNodeUuid,
          event: 'click',
          actions: [
            {
              kind: 'move-array-item' as const,
              name: 'items',
              repeaterUuid,
              direction: 'down' as const,
            },
          ],
        },
      ],
    };
    const result = executeComponentBehavior(behavior, rootNodeUuid, 'click', {
      state: behavior.state,
      repeaterIndices: { [repeaterUuid]: 1 },
    });

    expect(result.state.items).toEqual(['first', 'third', 'second']);
    expect(behavior.state.items).toEqual(['first', 'second', 'third']);
  });

  it('adds schema defaults with a unique stable ID and removes the current repeater row', () => {
    const repeaterUuid = globalThis.crypto.randomUUID();
    const behavior = {
      state: { items: [{ id: 'first', label: 'One', active: true }] },
      stateSchema: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              active: { type: 'boolean' },
            },
          },
        },
      },
      stateArrayKeyPaths: { items: 'id' },
      transitions: [
        {
          nodeUuid: rootNodeUuid,
          event: 'click',
          actions: [
            { kind: 'append-array-item' as const, name: 'items', repeaterUuid },
            { kind: 'remove-array-item' as const, name: 'items', repeaterUuid },
          ],
        },
      ],
    };
    const result = executeComponentBehavior(behavior, rootNodeUuid, 'click', {
      state: behavior.state,
      repeaterIndices: { [repeaterUuid]: 0 },
    });

    const items = result.state.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ label: '', active: false });
    expect(items[0]?.id).toEqual(expect.any(String));
    expect(items[0]?.id).not.toBe('first');
    expect(behavior.state.items).toEqual([{ id: 'first', label: 'One', active: true }]);
  });

  it.each([
    ['before', 0, 2, ['third', 'first', 'second']],
    ['after', 2, 0, ['second', 'third', 'first']],
  ] as const)(
    'drops a dragged row %s another row without mutating state',
    (direction, target, source, expected) => {
      const repeaterUuid = globalThis.crypto.randomUUID();
      const behavior = {
        state: { items: ['first', 'second', 'third'] },
        transitions: [
          {
            nodeUuid: rootNodeUuid,
            event: 'drop',
            actions: [
              {
                kind: 'move-array-item' as const,
                name: 'items',
                repeaterUuid,
                direction,
              },
            ],
          },
        ],
      };
      const result = executeComponentBehavior(behavior, rootNodeUuid, 'drop', {
        state: behavior.state,
        repeaterIndices: { [repeaterUuid]: target },
        event: { draggedRepeaterIndices: { [repeaterUuid]: source } },
      });

      expect(result.state.items).toEqual(expected);
      expect(behavior.state.items).toEqual(['first', 'second', 'third']);
    },
  );

  it('executes ordered transition actions against an isolated state snapshot', () => {
    const behavior = {
      state: { open: false, count: 0 },
      transitions: [
        {
          nodeUuid: rootNodeUuid,
          event: 'click',
          actions: [
            {
              kind: 'set-state' as const,
              name: 'open',
              value: {
                kind: 'operation' as const,
                operator: 'toggle' as const,
                values: [{ kind: 'state' as const, name: 'open' }],
              },
            },
            { kind: 'increment' as const, name: 'count' },
            {
              kind: 'emit' as const,
              name: 'change',
              args: [
                { kind: 'state-after-transition' as const, name: 'open' },
                { kind: 'state-after-transition' as const, name: 'count' },
              ],
            },
          ],
        },
      ],
    };

    const result = executeComponentBehavior(behavior, rootNodeUuid, 'click', {
      state: behavior.state,
    });
    expect(result.state).toEqual({ open: true, count: 1 });
    expect(result.emitted).toEqual([{ name: 'change', args: [true, 1] }]);
    expect(behavior.state).toEqual({ open: false, count: 0 });
    expect(
      executeComponentBehavior(behavior, rootNodeUuid, 'keydown', { state: behavior.state })
        .matched,
    ).toBe(false);
  });

  it('reads state from the event start while state-after-transition reads pending writes', () => {
    const behavior = {
      state: { count: 0 },
      transitions: [
        {
          nodeUuid: rootNodeUuid,
          event: 'click',
          actions: [
            { kind: 'increment' as const, name: 'count' },
            {
              kind: 'set-state' as const,
              name: 'count',
              value: {
                kind: 'operation' as const,
                operator: 'add' as const,
                values: [
                  { kind: 'state' as const, name: 'count' },
                  { kind: 'literal' as const, value: 10 },
                ],
              },
            },
            {
              kind: 'emit' as const,
              name: 'change',
              args: [
                { kind: 'state' as const, name: 'count' },
                { kind: 'state-after-transition' as const, name: 'count' },
              ],
            },
          ],
        },
      ],
    };

    const first = executeComponentBehavior(behavior, rootNodeUuid, 'click', {
      state: behavior.state,
    });
    const second = executeComponentBehavior(behavior, rootNodeUuid, 'click', {
      state: first.state,
    });
    expect(first.state.count).toBe(10);
    expect(first.emitted[0]?.args).toEqual([0, 10]);
    expect(second.state.count).toBe(20);
    expect(second.emitted[0]?.args).toEqual([10, 20]);
  });
});
