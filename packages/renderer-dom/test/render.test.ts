/**
 * @vitest-environment jsdom
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveVariantDocument,
  toFlat,
  validateCatalog,
  type DocumentChange,
  type DocumentFile,
  type DocumentStore,
  type FieldValue,
  type SchemaCatalog,
} from '@facadeur/core';
import {
  createDomRenderer,
  createRenderContext,
  renderDocument,
  renderNode,
} from '@facadeur/renderer-dom';
import { resolveDocumentFields, resolveInstance } from '../src/resolve';
import { renderedNode, renderedNodes } from './rendered-node';

const examplesDir = resolve(process.cwd(), 'examples');

function exampleSchemaCatalog(): SchemaCatalog {
  const raw = JSON.parse(readFileSync(resolve(examplesDir, 'schemas.json'), 'utf8')) as {
    schemas: SchemaCatalog['schemas'];
  };
  return { schemas: raw.schemas };
}

function examples(): DocumentFile[] {
  const raw = readdirSync(examplesDir)
    .filter((name) => name.endsWith('.json') && name !== 'schemas.json')
    .map((name) => JSON.parse(readFileSync(resolve(examplesDir, name), 'utf8')) as unknown);
  return validateCatalog(raw, { schemaCatalog: exampleSchemaCatalog() });
}

describe('renderer', () => {
  it('selects the first matching switch child and keeps the switch transparent', () => {
    const page: DocumentFile = {
      version: 1,
      id: 'structural-switch-page',
      name: 'Structural switch page',
      kind: 'page',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'switch-instance',
            type: 'instance',
            component: 'structural-switch',
            fields: { props: { title: 'First card' } },
          },
        ],
      },
    };
    const switched: DocumentFile = {
      version: 1,
      id: 'structural-switch',
      name: 'Structural switch',
      kind: 'component',
      root: {
        id: 'root',
        type: 'switch',
        children: [
          { id: 'card', type: 'instance', component: 'structural-card' },
          { id: 'badge', type: 'instance', component: 'structural-badge' },
        ],
      },
    };
    const card: DocumentFile = {
      version: 1,
      id: 'structural-card',
      name: 'Card',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'text',
        tag: 'article',
        bindings: [{ field: 'title', target: 'text' }],
      },
    };
    const badge: DocumentFile = {
      version: 1,
      id: 'structural-badge',
      name: 'Badge',
      kind: 'component',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'text',
        tag: 'strong',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    const host = document.createElement('main');
    renderDocument(page, [page, switched, card, badge], host);

    expect(host.querySelectorAll('article')).toHaveLength(1);
    expect(host.querySelector('strong')).toBeNull();
    expect(host.querySelector('[data-id="switch-instance/root/card"]')?.textContent).toBe(
      'First card',
    );
    expect(host.querySelector('[data-id="switch-instance/root"]')).toBeNull();
  });

  it('renders repeater union items as matching component instances without repeater wrappers', () => {
    const schemaCatalog: SchemaCatalog = {
      schemas: [
        {
          id: 'CardData',
          name: 'Card data',
          schema: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['card'] }, title: { type: 'string' } },
            required: ['type', 'title'],
            additionalProperties: false,
          },
        },
        {
          id: 'BadgeData',
          name: 'Badge data',
          schema: {
            type: 'object',
            properties: { type: { type: 'string', enum: ['badge'] }, label: { type: 'string' } },
            required: ['type', 'label'],
            additionalProperties: false,
          },
        },
      ],
    };
    const page: DocumentFile = {
      version: 1,
      id: 'structural-repeater-page',
      name: 'Structural repeater page',
      kind: 'page',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'repeat-instance',
            type: 'instance',
            component: 'structural-repeater',
            fields: {
              items: [
                { type: 'card', title: 'Card row' },
                { type: 'badge', label: 'Badge row' },
              ],
            },
          },
        ],
      },
    };
    const repeater: DocumentFile = {
      version: 1,
      id: 'structural-repeater',
      name: 'Structural repeater',
      kind: 'component',
      root: {
        id: 'root',
        type: 'repeater',
        children: [
          {
            id: 'choice',
            type: 'switch',
            children: [
              { id: 'card', type: 'instance', component: 'structural-card' },
              { id: 'badge', type: 'instance', component: 'structural-badge' },
            ],
          },
        ],
      },
    };
    const card: DocumentFile = {
      version: 1,
      id: 'structural-card',
      name: 'Card',
      kind: 'component',
      schemaUse: { direct: { kind: 'schema', schemaId: 'CardData' } },
      root: {
        id: 'root',
        type: 'text',
        tag: 'article',
        bindings: [{ field: 'title', target: 'text' }],
      },
    };
    const badge: DocumentFile = {
      version: 1,
      id: 'structural-badge',
      name: 'Badge',
      kind: 'section',
      schemaUse: { direct: { kind: 'schema', schemaId: 'BadgeData' } },
      root: {
        id: 'root',
        type: 'text',
        tag: 'strong',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    const host = document.createElement('main');
    renderDocument(page, [page, repeater, card, badge], host, { schemaCatalog });

    expect([...host.querySelectorAll('article, strong')].map((node) => node.textContent)).toEqual([
      'Card row',
      'Badge row',
    ]);
    expect(host.querySelectorAll('[data-type="repeater"], [data-type="switch"]')).toHaveLength(0);
    expect(host.querySelector('[data-id="repeat-instance/root/0/choice/card"]')).not.toBeNull();
    expect(host.querySelector('[data-id="repeat-instance/root/1/choice/badge"]')).not.toBeNull();

    const context = createRenderContext([page, repeater, card, badge], { schemaCatalog });
    context.canvasDocument = page;
    context.styleDocumentId = page.id;
    context.scope = resolveDocumentFields(page, context.catalog, context.schemaCatalog);
    const resolved = resolveInstance('repeat-instance/root/1/choice/badge', context);
    expect(resolved?.instance.id).toBe('badge');
    expect(resolved?.path).toBe('repeat-instance/root/1/choice');
    expect(resolved?.scope.props).toEqual({ type: 'badge', label: 'Badge row' });
  });

  it('carries three nested repeat scopes through a component instance', () => {
    const page: DocumentFile = {
      version: 1,
      id: 'nested-repeat-parent-page',
      name: 'Nested repeat parent page',
      kind: 'page',
      fields: [
        {
          name: 'sections',
          type: 'array',
          default: [
            {
              name: 'Section one',
              rows: [{ name: 'Row one', values: [{ name: 'Leaf one' }] }],
            },
          ],
          items: {
            type: 'object',
            fields: [
              { name: 'name', type: 'text', required: true },
              {
                name: 'rows',
                type: 'array',
                items: {
                  type: 'object',
                  fields: [
                    { name: 'name', type: 'text', required: true },
                    {
                      name: 'values',
                      type: 'array',
                      items: {
                        type: 'object',
                        fields: [{ name: 'name', type: 'text', required: true }],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'sections',
            type: 'frame',
            repeat: { path: 'sections', as: 'section' },
            children: [
              {
                id: 'rows',
                type: 'frame',
                repeat: { path: 'section.rows', as: 'row' },
                children: [
                  {
                    id: 'values',
                    type: 'frame',
                    repeat: { path: 'row.values', as: 'value' },
                    children: [
                      {
                        id: 'probe',
                        type: 'instance',
                        component: 'nested-repeat-scope-probe',
                        fieldBindings: {
                          currentName: 'value.name',
                          rowName: 'parent.item.name',
                          sectionName: 'parent.parent.item.name',
                          currentIndex: 'index',
                          rowIndex: 'parent.index',
                          sectionIndex: 'parent.parent.index',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const probe: DocumentFile = {
      version: 1,
      id: 'nested-repeat-scope-probe',
      name: 'Nested repeat scope probe',
      kind: 'atom',
      fields: [
        { name: 'currentName', type: 'text' },
        { name: 'rowName', type: 'text' },
        { name: 'sectionName', type: 'text' },
        { name: 'currentIndex', type: 'number' },
        { name: 'rowIndex', type: 'number' },
        { name: 'sectionIndex', type: 'number' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'current', type: 'text', bindings: [{ field: 'currentName', target: 'text' }] },
          { id: 'row', type: 'text', bindings: [{ field: 'rowName', target: 'text' }] },
          { id: 'section', type: 'text', bindings: [{ field: 'sectionName', target: 'text' }] },
          {
            id: 'current-index',
            type: 'text',
            bindings: [{ field: 'currentIndex', target: 'text' }],
          },
          { id: 'row-index', type: 'text', bindings: [{ field: 'rowIndex', target: 'text' }] },
          {
            id: 'section-index',
            type: 'text',
            bindings: [{ field: 'sectionIndex', target: 'text' }],
          },
        ],
      },
    };
    const host = document.createElement('main');
    renderDocument(page, [page, probe], host);

    expect(host.textContent).toBe('Leaf oneRow oneSection one000');
    expect(host.querySelector('[data-id="sections/0/rows/0/values/0/probe"]')).not.toBeNull();
  });

  it('selects explicit same-schema cases and preserves nested item, props, index, and parent scopes', () => {
    const schemaCatalog: SchemaCatalog = {
      schemas: [
        {
          id: 'OuterPayload',
          name: 'Outer payload',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { const: 'child' },
                    props: {
                      type: 'object',
                      properties: { title: { type: 'string' } },
                      required: ['title'],
                      additionalProperties: false,
                    },
                  },
                  required: ['type', 'props'],
                  additionalProperties: false,
                },
              },
            },
            required: ['title', 'items'],
            additionalProperties: false,
          },
        },
        {
          id: 'InnerPayload',
          name: 'Inner payload',
          schema: {
            type: 'object',
            properties: { title: { type: 'string' } },
            required: ['title'],
            additionalProperties: false,
          },
        },
      ],
    };
    const page: DocumentFile = {
      version: 1,
      id: 'explicit-case-page',
      name: 'Explicit case page',
      kind: 'page',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'list-instance',
            type: 'instance',
            component: 'explicit-case-list',
            fields: {
              items: [
                {
                  type: 'wrapper',
                  props: {
                    title: 'Outer card',
                    items: [{ type: 'child', props: { title: 'Inner row' } }],
                  },
                },
                { type: 'alternate', props: { title: 'Alternate card', items: [] } },
              ],
            },
          },
        ],
      },
    };
    const list: DocumentFile = {
      version: 1,
      id: 'explicit-case-list',
      name: 'Explicit case list',
      kind: 'component',
      root: {
        id: 'root',
        type: 'repeater',
        children: [
          {
            id: 'choice',
            type: 'switch',
            children: [
              {
                id: 'wrapper',
                type: 'instance',
                component: 'outer-wrapper',
                switchCase: 'wrapper',
              },
              {
                id: 'alternate',
                type: 'instance',
                component: 'outer-alternate',
                switchCase: 'alternate',
              },
            ],
          },
        ],
      },
    };
    const wrapper: DocumentFile = {
      version: 1,
      id: 'outer-wrapper',
      name: 'Outer wrapper',
      kind: 'component',
      schemaUse: { direct: { kind: 'schema', schemaId: 'OuterPayload' } },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'nested-list',
            type: 'instance',
            component: 'nested-case-list',
            fieldBindings: { items: 'items' },
          },
        ],
      },
    };
    const alternate: DocumentFile = {
      version: 1,
      id: 'outer-alternate',
      name: 'Outer alternate',
      kind: 'component',
      schemaUse: { direct: { kind: 'schema', schemaId: 'OuterPayload' } },
      root: {
        id: 'root',
        type: 'text',
        tag: 'article',
        bindings: [{ field: 'title', target: 'text' }],
      },
    };
    const nestedList: DocumentFile = {
      version: 1,
      id: 'nested-case-list',
      name: 'Nested case list',
      kind: 'component',
      root: {
        id: 'root',
        type: 'repeater',
        children: [
          {
            id: 'choice',
            type: 'switch',
            children: [
              {
                id: 'child',
                type: 'instance',
                component: 'inner-row',
                switchCase: 'child',
              },
            ],
          },
        ],
      },
    };
    const innerRow: DocumentFile = {
      version: 1,
      id: 'inner-row',
      name: 'Inner row',
      kind: 'component',
      schemaUse: { direct: { kind: 'schema', schemaId: 'InnerPayload' } },
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'probe',
            type: 'instance',
            component: 'scope-probe',
            fields: { title: 'Nested local title' },
            fieldBindings: {
              outerType: 'parent.item.type',
              outerTitle: 'parent.item.props.title',
              outerIndex: 'parent.index',
              innerType: 'item.type',
              innerTitle: 'props.title',
              innerIndex: 'index',
            },
          },
        ],
      },
    };
    const probe: DocumentFile = {
      version: 1,
      id: 'scope-probe',
      name: 'Scope probe',
      kind: 'component',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'outerType', type: 'text' },
        { name: 'outerTitle', type: 'text' },
        { name: 'outerIndex', type: 'number' },
        { name: 'innerType', type: 'text' },
        { name: 'innerTitle', type: 'text' },
        { name: 'innerIndex', type: 'number' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'outer-type', type: 'text', bindings: [{ field: 'outerType', target: 'text' }] },
          { id: 'outer-title', type: 'text', bindings: [{ field: 'outerTitle', target: 'text' }] },
          { id: 'outer-index', type: 'text', bindings: [{ field: 'outerIndex', target: 'text' }] },
          { id: 'inner-type', type: 'text', bindings: [{ field: 'innerType', target: 'text' }] },
          { id: 'inner-title', type: 'text', bindings: [{ field: 'innerTitle', target: 'text' }] },
          { id: 'inner-index', type: 'text', bindings: [{ field: 'innerIndex', target: 'text' }] },
          {
            id: 'nested-props',
            type: 'instance',
            component: 'scope-probe-leaf',
            fieldBindings: { observed: 'props.title' },
          },
        ],
      },
    };
    const probeLeaf: DocumentFile = {
      version: 1,
      id: 'scope-probe-leaf',
      name: 'Scope probe leaf',
      kind: 'atom',
      fields: [{ name: 'observed', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'observed', target: 'text' }],
      },
    };
    expect(() =>
      validateCatalog([page, list, wrapper, alternate, nestedList, innerRow, probe, probeLeaf], {
        schemaCatalog,
      }),
    ).not.toThrow();
    const listInstance = page.root.type === 'frame' ? page.root.children?.[0] : undefined;
    if (!listInstance || listInstance.type !== 'instance') throw new Error('missing list instance');
    listInstance.fields = {
      ...listInstance.fields,
      items: [
        ...((listInstance.fields?.items as FieldValue[] | undefined) ?? []),
        { type: 'unknown', props: { title: 'Must not render', items: [] } },
      ],
    };
    const host = document.createElement('main');
    renderDocument(
      page,
      [page, list, wrapper, alternate, nestedList, innerRow, probe, probeLeaf],
      host,
      {
        schemaCatalog,
      },
    );

    expect(
      host.querySelector('[data-id="list-instance/root/1/choice/alternate"]')?.textContent,
    ).toBe('Alternate card');
    expect(host.querySelector('[data-id="list-instance/root/2/choice/wrapper"]')).toBeNull();
    const probeNode = host.querySelector('[data-component="scope-probe"]');
    expect(probeNode?.textContent).toBe('wrapperOuter card0childInner row0Nested local title');
  });

  it('automatically forwards matching parent values unless the instance opts out', () => {
    const parent: DocumentFile = {
      version: 1,
      id: 'auto-field-parent',
      name: 'Auto field parent',
      kind: 'component',
      fields: [{ name: 'value', type: 'text', default: 'Parent value' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          { id: 'forwarded', type: 'instance', component: 'auto-field-child' },
          {
            id: 'manual',
            type: 'instance',
            component: 'auto-field-child',
            forwardFields: false,
          },
        ],
      },
    };
    const child: DocumentFile = {
      version: 1,
      id: 'auto-field-child',
      name: 'Auto field child',
      kind: 'atom',
      fields: [{ name: 'value', type: 'text', default: 'Child default' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'value', target: 'text' }],
      },
    };

    expect(() => validateCatalog([parent, child])).not.toThrow();
    if (parent.root.type !== 'frame') throw new Error('Expected a parent frame');
    const [forwarded, manual] = parent.root.children ?? [];
    if (!forwarded || !manual) throw new Error('Expected both child instances');
    const context = createRenderContext([parent, child]);
    context.scope = { value: 'Parent runtime value' };
    expect(renderNode(forwarded, context).textContent).toBe('Parent runtime value');
    expect(renderNode(manual, context).textContent).toBe('Child default');
  });

  it('lets an explicit local instance value override the bound value in preview', () => {
    const parent: DocumentFile = {
      version: 1,
      id: 'preview-override-parent',
      name: 'Preview override parent',
      kind: 'component',
      fields: [{ name: 'source', type: 'text', default: 'Bound value' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'child',
            type: 'instance',
            component: 'preview-override-child',
            fields: { label: 'Local preview' },
            fieldBindings: { label: 'source' },
          },
        ],
      },
    };
    const child: DocumentFile = {
      version: 1,
      id: 'preview-override-child',
      name: 'Preview override child',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text' }],
      root: {
        id: 'root',
        type: 'text',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };

    expect(() => validateCatalog([parent, child])).not.toThrow();
    const host = document.createElement('div');
    renderDocument(parent, [parent, child], host, { paintRoot: true });
    expect(renderedNode(host, 'root/child')?.textContent).toBe('Local preview');
  });

  it('can preview a named mounted variant without changing the source document', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'variant-preview',
      name: 'Variant preview',
      kind: 'component',
      variants: [
        { name: 'default' },
        { name: 'compact', overrides: { nodes: { root: { text: 'Compact' } } } },
      ],
      root: { id: 'root', type: 'text', tag: 'span', text: 'Base' },
    };
    const host = document.createElement('div');
    const renderer = createDomRenderer({
      parent: host,
      catalog: [component],
      paintRoot: true,
      resolveMountedDocument: (source) => resolveVariantDocument(source, 'compact'),
    });

    renderer.mount(component);

    expect(renderedNode(host, 'root')?.textContent).toBe('Compact');
    expect(component.root).toMatchObject({ text: 'Base' });
    renderer.destroy();
  });

  it('exposes a mounted ordinary component’s effective fields through props scope', () => {
    const component: DocumentFile = {
      version: 1,
      id: 'mounted-props-scope',
      name: 'Mounted props scope',
      kind: 'component',
      fields: [{ name: 'title', type: 'text', default: 'Standalone' }],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'visible',
            type: 'text',
            text: 'Visible',
            displayOn: { path: 'props.title', equals: 'Standalone' },
          },
        ],
      },
    };

    const directHost = document.createElement('main');
    renderDocument(component, [component], directHost);
    expect(renderedNode(directHost, 'visible')?.textContent).toBe('Visible');

    const mountedHost = document.createElement('main');
    const renderer = createDomRenderer({ parent: mountedHost, catalog: [component] });
    renderer.mount(component);
    expect(renderedNode(mountedHost, 'visible')?.textContent).toBe('Visible');
    renderer.destroy();
  });

  it('expands instances, bindings, and variant data attributes', () => {
    const documents = examples();
    const button = documents.find((document) => document.id === 'button');
    if (!button) throw new Error('missing button');
    const host = document.createElement('div');
    const page: DocumentFile = {
      version: 1,
      id: 'preview',
      name: 'Preview',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'go',
            type: 'instance',
            component: 'button',
            fields: { label: 'Continue' },
            variants: { tone: 'ghost', size: 'sm' },
            layout: {
              position: 'absolute',
              x: 12,
              y: 4,
              width: { mode: 'fixed', size: 80 },
            },
          },
        ],
      },
    };
    const records = renderDocument(page, [page, button], host);
    const buttonEl = renderedNode(host, 'go');
    expect(buttonEl).toBeInstanceOf(HTMLButtonElement);
    expect(buttonEl?.textContent).toBe('Continue');
    expect(buttonEl?.getAttribute('data-variant-tone')).toBe('ghost');
    expect(buttonEl?.getAttribute('data-variant-size')).toBe('sm');
    expect(buttonEl?.getAttribute('data-node')).toBe('go');
    expect((buttonEl as HTMLElement).style.left).toBe('');
    expect(records.get('go')?.text).toBe('Continue');
    expect(records.get('go')?.fields).toMatchObject({ label: 'Continue' });
    expect(records.get('go/label')).toBeUndefined();
    const hostEmpty = document.createElement('div');
    renderDocument(
      {
        version: 1,
        id: 'empty-doc',
        name: 'Empty',
        kind: 'atom',
        root: {
          id: 'root',
          type: 'frame',
          children: [{ id: 'box', type: 'frame' }],
        },
      },
      [],
      hostEmpty,
      { paintRoot: true },
    );
    expect(renderedNode(hostEmpty, 'root')?.getAttribute('data-empty')).toBeNull();
    expect(renderedNode(hostEmpty, 'root/box')?.getAttribute('data-empty')).toBe('true');

    const nativeControls = document.createElement('div');
    renderDocument(
      {
        version: 1,
        id: 'native-controls',
        name: 'Native controls',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [
            { id: 'input', type: 'frame', tag: 'input' },
            { id: 'select', type: 'frame', tag: 'select' },
            { id: 'textarea', type: 'frame', tag: 'textarea' },
          ],
        },
      },
      [],
      nativeControls,
      { paintRoot: true },
    );
    for (const id of ['input', 'select', 'textarea']) {
      expect(renderedNode(nativeControls, `root/${id}`)?.getAttribute('data-empty')).toBeNull();
    }

    const fixedEmpty = document.createElement('div');
    renderDocument(
      {
        version: 1,
        id: 'fixed-empty',
        name: 'Fixed empty',
        kind: 'component',
        root: {
          id: 'root',
          type: 'frame',
          children: [
            {
              id: 'thumb',
              type: 'frame',
              layout: {
                width: { mode: 'fixed', size: 16 },
                height: { mode: 'fixed', size: 16 },
              },
            },
          ],
        },
      },
      [],
      fixedEmpty,
      { paintRoot: true },
    );
    expect(renderedNode(fixedEmpty, 'root/thumb')?.getAttribute('data-empty')).toBe(null);
  });

  it('applies sparse child field overrides at the owning instance only', () => {
    const control: DocumentFile = {
      version: 1,
      id: 'nested-control',
      name: 'Nested control',
      kind: 'atom',
      fields: [
        { name: 'label', type: 'text', default: 'Label' },
        { name: 'value', type: 'text', default: '' },
        { name: 'placeholder', type: 'text', default: 'Placeholder' },
      ],
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'label',
            type: 'text',
            bindings: [{ field: 'label', target: 'text' }],
          },
        ],
      },
    };
    const owner: DocumentFile = {
      version: 1,
      id: 'nested-owner',
      name: 'Nested owner',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'email', type: 'instance', component: control.id }],
      },
    };
    const use: DocumentFile = {
      version: 1,
      id: 'nested-use',
      name: 'Nested use',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'form',
            type: 'instance',
            component: owner.id,
            childFields: { email: { label: 'Work email' } },
          },
        ],
      },
    };
    const host = document.createElement('div');
    renderDocument(use, [use, owner, control], host);
    expect(renderedNode(host, 'form/email/label')?.textContent).toBe('Work email');
    expect(renderedNode(host, 'form/email')?.getAttribute('data-component')).toBe(control.id);
    expect(use.root).toMatchObject({
      children: [{ childFields: { email: { label: 'Work email' } } }],
    });
    expect(owner.root).toMatchObject({ children: [{ id: 'email' }] });
    expect(
      (owner.root as Extract<typeof owner.root, { type: 'frame' }>).children?.[0],
    ).not.toHaveProperty('fields');
  });

  it('paints the specimen page with nested instance ids', () => {
    const documents = examples();
    const page = documents.find((document) => document.id === 'specimen');
    if (!page) throw new Error('missing page');
    const host = document.createElement('div');
    const records = renderDocument(page, documents, host, {
      schemaCatalog: exampleSchemaCatalog(),
    });
    expect(renderedNode(host, 'specimen-section/intro/heading')?.textContent).toBe('Specimen');
    expect(renderedNode(host, 'specimen-section/buttons/button-row/btn-primary')?.textContent).toBe(
      'Primary',
    );
    expect(
      renderedNode(host, 'specimen-section/cards/card-row/card-notes/title')?.textContent,
    ).toBe('Field notes');
    expect(
      renderedNode(host, 'specimen-section/cards/card-row/card-signin/email/control')?.getAttribute(
        'value',
      ),
    ).toBe('ada@atelier.test');
    expect(records.get('specimen-section/cards/card-row/card-signin/continue')?.component).toBe(
      'button',
    );
    expect(renderedNode(host, 'specimen-section')?.getAttribute('style')).toBeNull();
  });

  it('skips event-handler attributes and shows an unknown component', () => {
    const page: DocumentFile = {
      version: 1,
      id: 'loose',
      name: 'Loose',
      kind: 'atom',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'label',
            type: 'text',
            tag: 'span',
            text: 'Hi',
            attributes: { class: 'label', onclick: 'alert(1)' },
          },
          { id: 'missing', type: 'instance', component: 'nope' },
        ],
      },
    };
    const host = document.createElement('div');
    renderDocument(page, [page], host);
    const label = renderedNode(host, 'label');
    expect(label?.getAttribute('onclick')).toBeNull();
    expect(label?.getAttribute('class')).toBe('label');
    expect(renderedNode(host, 'missing')?.textContent).toBe('Unknown component: nope');
  });

  it('builds nodes in the document that hosts the parent', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const frameDocument = iframe.contentDocument;
    if (!frameDocument?.body) throw new Error('iframe has no document');
    const documents = examples();
    const page = documents.find((entry) => entry.id === 'specimen');
    if (!page) throw new Error('missing page');
    renderDocument(page, documents, frameDocument.body, {
      schemaCatalog: exampleSchemaCatalog(),
    });
    const heading = renderedNode(frameDocument, 'specimen-section/intro/heading');
    expect(heading?.ownerDocument).toBe(frameDocument);
    expect(heading?.textContent).toBe('Specimen');
    expect(document.body.contains(heading)).toBe(false);
    iframe.remove();
  });

  it('patches a node inside an iframe instead of appending a second copy', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    const body = iframe.contentDocument?.body;
    if (!body) throw new Error('iframe has no document');
    const before: DocumentFile = {
      version: 1,
      id: 'sheet',
      name: 'Sheet',
      kind: 'section',
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'title', type: 'text', tag: 'h1', text: 'Before' }],
      },
    };
    const after: DocumentFile = {
      ...before,
      root: {
        id: 'root',
        type: 'frame',
        children: [{ id: 'title', type: 'text', tag: 'h1', text: 'After' }],
      },
    };
    renderDocument(before, [before], body);
    renderDocument(after, [after], body);
    expect(renderedNodes(body, 'title')).toHaveLength(1);
    expect(renderedNode(body, 'title')?.textContent).toBe('After');
    iframe.remove();
  });

  it('paints an atom root only when paintRoot is set', () => {
    const documents = examples();
    const button = documents.find((document) => document.id === 'button');
    if (!button) throw new Error('missing button');
    const hidden = document.createElement('div');
    renderDocument(button, documents, hidden);
    expect(renderedNode(hidden, 'root')).toBeNull();

    const shown = document.createElement('div');
    renderDocument(button, documents, shown, { paintRoot: true });
    const root = renderedNode(shown, 'root');
    expect(root?.tagName).toBe('BUTTON');
    expect(root?.textContent).toBe('');
    expect(root?.getAttribute('data-component')).toBe('button');
    expect(root?.getAttribute('data-variant-tone')).toBe('primary');
    expect(root?.getAttribute('data-variant-size')).toBe('md');
  });

  it('repeats children from an object array and evaluates display conditions', () => {
    const form: DocumentFile = {
      version: 1,
      id: 'data-form',
      name: 'Data form',
      kind: 'component',
      fields: [
        {
          name: 'fields',
          type: 'array',
          default: [
            { id: 'email', kind: 'input', label: 'Email' },
            { id: 'message', kind: 'textarea', label: 'Message' },
          ],
          items: {
            type: 'object',
            fields: [
              { name: 'id', type: 'text', required: true },
              { name: 'kind', type: 'enum', options: ['input', 'textarea'], required: true },
              { name: 'label', type: 'text', required: true },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'fields', as: 'field', key: 'id' },
        children: [
          {
            id: 'input',
            type: 'instance',
            component: 'data-row',
            fieldBindings: { label: 'field.label' },
            displayOn: { path: 'field.kind', equals: 'input' },
          },
          {
            id: 'textarea',
            type: 'instance',
            component: 'data-row',
            fieldBindings: { label: 'field.label' },
            displayOn: { path: 'field.kind', equals: 'textarea' },
          },
        ],
      },
    };
    const row: DocumentFile = {
      version: 1,
      id: 'data-row',
      name: 'Data row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'text',
        tag: 'span',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    expect(() => validateCatalog([form, row])).not.toThrow();
    const host = document.createElement('div');
    const records = renderDocument(form, [form, row], host, { paintRoot: true });
    expect(host.querySelectorAll('[data-node="input"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-node="textarea"]')).toHaveLength(1);
    expect(renderedNode(host, 'root/email/input')?.textContent).toBe('Email');
    expect(renderedNode(host, 'root/message/textarea')?.textContent).toBe('Message');
    expect(records.has('root/email/input')).toBe(true);
    expect(records.has('root/email/textarea')).toBe(false);
  });

  it('repaints component instances inside repeated data rows', () => {
    const rowBefore: DocumentFile = {
      version: 1,
      id: 'repaint-row',
      name: 'Repaint row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: {
        id: 'root',
        type: 'text',
        tag: 'span',
        bindings: [{ field: 'label', target: 'text' }],
      },
    };
    const rowAfter: DocumentFile = {
      ...rowBefore,
      root: {
        id: 'root',
        type: 'text',
        tag: 'span',
        text: 'After',
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'repaint-host',
      name: 'Repaint host',
      kind: 'component',
      fields: [
        {
          name: 'items',
          type: 'array',
          default: [{ id: 'billing/email', label: 'Before' }],
          items: {
            type: 'object',
            fields: [
              { name: 'id', type: 'text', required: true },
              { name: 'label', type: 'text', required: true },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'items', as: 'item', key: 'id' },
        children: [
          {
            id: 'row',
            type: 'instance',
            component: 'repaint-row',
            fieldBindings: { label: 'item.label' },
          },
        ],
      },
    };
    expect(() => validateCatalog([host, rowBefore])).not.toThrow();

    const parent = document.createElement('div');
    const renderer = createDomRenderer({
      parent,
      catalog: [host, rowBefore],
      paintRoot: true,
    });
    renderer.mount(host);
    expect(renderedNode(parent, 'root/billing%2Femail/row')?.textContent).toBe('Before');

    let notify: ((change: DocumentChange) => void) | undefined;
    const store: DocumentStore = {
      getDocument: () => toFlat(rowAfter),
      getNode: () => undefined,
      execute: () => undefined,
      subscribe: (listener) => {
        notify = listener;
        return () => undefined;
      },
      undo: () => undefined,
      redo: () => undefined,
      canUndo: () => false,
      canRedo: () => false,
    };
    renderer.connect(store);
    notify?.({ reason: 'undo' });

    expect(renderedNodes(parent, 'root/billing%2Femail/row')).toHaveLength(1);
    expect(renderedNode(parent, 'root/billing%2Femail/row')?.textContent).toBe('After');
    renderer.destroy();
  });

  it('activates named component variants in DOM instances', () => {
    const card: DocumentFile = {
      version: 1,
      id: 'variant-card',
      name: 'Variant card',
      kind: 'component',
      variants: [
        { name: 'default' },
        {
          name: 'compact',
          overrides: {
            nodes: { lede: { text: 'Compact' } },
            removed: ['body'],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        tag: 'article',
        children: [
          { id: 'lede', type: 'text', text: 'Default' },
          { id: 'body', type: 'text', text: 'Body' },
        ],
      },
    };
    const host: DocumentFile = {
      version: 1,
      id: 'variant-host',
      name: 'Variant host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'card',
            type: 'instance',
            component: 'variant-card',
            variants: { variant: 'compact' },
          },
        ],
      },
    };
    expect(() => validateCatalog([host, card])).not.toThrow();
    const element = document.createElement('div');
    renderDocument(host, [host, card], element, { paintRoot: true });
    const cardElement = element.querySelector('[data-component="variant-card"]');
    expect(cardElement?.tagName).toBe('ARTICLE');
    expect(cardElement?.getAttribute('data-variant')).toBe('compact');
    expect(cardElement?.textContent).toBe('Compact');
    expect(cardElement?.querySelector('[data-node="body"]')).toBeNull();
  });

  it('does not emit a named variant marker for a default-only preset', () => {
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
    const element = document.createElement('div');
    renderDocument(host, [host, card], element, { paintRoot: true });
    const cardElement = element.querySelector('[data-component="default-only-card"]');
    expect(cardElement?.getAttribute('data-variant')).toBeNull();
    expect(cardElement?.textContent).toBe('Card');
  });

  it('renders the data-driven media example with mutually exclusive branches', () => {
    const media = examples().find((document) => document.id === 'media');
    if (!media) throw new Error('missing media example');
    const host: DocumentFile = {
      version: 1,
      id: 'media-host',
      name: 'Media host',
      kind: 'component',
      root: {
        id: 'root',
        type: 'frame',
        children: [
          {
            id: 'image',
            type: 'instance',
            component: 'media',
            fields: { src: '/cover.png', alt: 'Cover', kind: 'image' },
          },
          {
            id: 'video',
            type: 'instance',
            component: 'media',
            fields: { src: '/intro.mp4', kind: 'video' },
          },
        ],
      },
    };
    const schemaCatalog = exampleSchemaCatalog();
    expect(() => validateCatalog([host, media], { schemaCatalog })).not.toThrow();
    const element = document.createElement('div');
    renderDocument(host, [host, media], element, { paintRoot: true, schemaCatalog });
    expect(renderedNode(element, 'root/image/image')?.getAttribute('src')).toBe('/cover.png');
    expect(renderedNode(element, 'root/image/video')).toBeNull();
    expect(renderedNode(element, 'root/video/video')?.getAttribute('src')).toBe('/intro.mp4');
    expect(renderedNode(element, 'root/video/image')).toBeNull();
  });

  it('keeps nested repeat scopes available to descendant rows', () => {
    const nested: DocumentFile = {
      version: 1,
      id: 'nested-repeat-render',
      name: 'Nested repeat render',
      kind: 'component',
      fields: [
        {
          name: 'sections',
          type: 'array',
          default: [{ rows: [{ label: 'One' }, { label: 'Two' }] }],
          items: {
            type: 'object',
            fields: [
              {
                name: 'rows',
                type: 'array',
                items: {
                  type: 'object',
                  fields: [{ name: 'label', type: 'text', required: true }],
                },
              },
            ],
          },
        },
      ],
      root: {
        id: 'root',
        type: 'frame',
        repeat: { path: 'sections', as: 'section' },
        children: [
          {
            id: 'rows',
            type: 'frame',
            repeat: { path: 'section.rows', as: 'row', key: 'label' },
            children: [
              {
                id: 'label',
                type: 'instance',
                component: 'nested-render-row',
                fieldBindings: { label: 'row.label' },
              },
            ],
          },
        ],
      },
    };
    const row: DocumentFile = {
      version: 1,
      id: 'nested-render-row',
      name: 'Nested render row',
      kind: 'atom',
      fields: [{ name: 'label', type: 'text', required: true }],
      root: { id: 'root', type: 'text', bindings: [{ field: 'label', target: 'text' }] },
    };
    expect(() => validateCatalog([nested, row])).not.toThrow();
    const element = document.createElement('div');
    renderDocument(nested, [nested, row], element, { paintRoot: true });
    expect(element.querySelectorAll('[data-node="label"]')).toHaveLength(2);
    expect(element.textContent).toContain('One');
    expect(element.textContent).toContain('Two');
  });
});
