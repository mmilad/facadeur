import { useEffect, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { NodeDefinition } from '@facadeur/domain';
import { EditorHost } from '../../../src/app/EditorHost';
import { createAppService } from '../../../src/app-service';
import { createInMemoryCatalogPort } from '../../../src/domain/project/in-memory-catalog-port';
import { createEditorSession } from '../../../src/domain/session/create-editor-session';
import { createExampleCatalog } from '@facadeur/examples';
import { useStorybookNavigation } from '../../lib/app/navigation';

const toggleDemo: NodeDefinition = {
  uuid: '860e8400-e29b-41d4-a716-446655440000',
  name: 'Behavior Toggle Demo',
  kind: 'component',
  schema: {
    kind: 'inline',
    schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  root: {
    uuid: '860e8400-e29b-41d4-a716-446655440001',
    classes: [
      {
        name: 'is-open',
        condition: {
          kind: 'condition',
          left: { kind: 'reference', reference: '{state:open}' },
          operator: 'equals',
          right: { kind: 'literal', value: true },
        },
      },
    ],
    dom: {
      tagName: 'div',
      children: [
        {
          uuid: '860e8400-e29b-41d4-a716-446655440002',
          dom: { tagName: 'button', text: 'Toggle me' },
        },
        {
          uuid: '860e8400-e29b-41d4-a716-446655440003',
          name: 'Search input',
          dom: {
            tagName: 'input',
            attributes: { type: 'text', 'aria-label': 'Preview text input' },
            properties: { value: 'Type here' },
          },
        },
        {
          uuid: '860e8400-e29b-41d4-a716-446655440004',
          name: 'Example select',
          dom: {
            tagName: 'select',
            attributes: { 'aria-label': 'Preview select' },
            properties: { value: 'phone' },
            children: [
              {
                uuid: '860e8400-e29b-41d4-a716-446655440005',
                dom: { tagName: 'option', attributes: { value: 'phone' }, text: 'Phone' },
              },
              {
                uuid: '860e8400-e29b-41d4-a716-446655440006',
                dom: { tagName: 'option', attributes: { value: 'desktop' }, text: 'Desktop' },
              },
            ],
          },
        },
        {
          uuid: '860e8400-e29b-41d4-a716-446655440007',
          name: 'Message textarea',
          dom: {
            tagName: 'textarea',
            attributes: { 'aria-label': 'Preview textarea' },
            properties: { value: 'Write a message' },
          },
        },
      ],
    },
  },
  behavior: {
    state: { open: false },
    transitions: [
      {
        nodeUuid: '860e8400-e29b-41d4-a716-446655440002',
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
        ],
      },
    ],
  },
};

const sortableListDemo: NodeDefinition = {
  uuid: '860e8400-e29b-41d4-a716-446655440010',
  name: 'Sortable List Demo',
  kind: 'component',
  schema: {
    kind: 'inline',
    schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  root: {
    uuid: '860e8400-e29b-41d4-a716-446655440011',
    name: 'Items',
    config: {
      composition: {
        kind: 'repeater',
        source: { kind: 'state', name: 'items' },
        indexName: 'rowIndex',
      },
    },
    dom: {
      tagName: 'ul',
      children: [
        {
          uuid: '860e8400-e29b-41d4-a716-446655440012',
          name: 'List item',
          dom: {
            tagName: 'li',
            children: [
              {
                uuid: '860e8400-e29b-41d4-a716-446655440013',
                name: 'Item label',
                dom: { tagName: 'span', text: '{item}' },
              },
              {
                uuid: '860e8400-e29b-41d4-a716-446655440014',
                name: 'Move up',
                dom: {
                  tagName: 'button',
                  attributes: { type: 'button', 'aria-label': 'Move item up' },
                  text: '↑',
                },
              },
              {
                uuid: '860e8400-e29b-41d4-a716-446655440015',
                name: 'Move down',
                dom: {
                  tagName: 'button',
                  attributes: { type: 'button', 'aria-label': 'Move item down' },
                  text: '↓',
                },
              },
            ],
          },
        },
      ],
    },
  },
  behavior: {
    state: { items: ['Alpha', 'Bravo', 'Charlie'] },
    stateSchema: { items: { type: 'array', items: { type: 'string' } } },
    transitions: [
      {
        nodeUuid: '860e8400-e29b-41d4-a716-446655440014',
        event: 'click',
        actions: [
          {
            kind: 'move-array-item',
            name: 'items',
            repeaterUuid: '860e8400-e29b-41d4-a716-446655440011',
            direction: 'up',
          },
        ],
      },
      {
        nodeUuid: '860e8400-e29b-41d4-a716-446655440015',
        event: 'click',
        actions: [
          {
            kind: 'move-array-item',
            name: 'items',
            repeaterUuid: '860e8400-e29b-41d4-a716-446655440011',
            direction: 'down',
          },
        ],
      },
    ],
  },
};

function BehaviorPreview({ definition }: { definition: NodeDefinition }) {
  const editor = useMemo(() => {
    const catalog = createExampleCatalog();
    const projectCatalog = {
      ...catalog,
      components: { ...catalog.components, [definition.uuid]: definition },
    };
    const session = createEditorSession({ projectCatalog });
    session.openAsset(definition.uuid, 'root');
    session.selectNode(definition.root.uuid);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });
    return { app, session };
  }, [definition]);
  const navigation = useStorybookNavigation(fn());
  useEffect(() => () => editor.session.destroy(), [editor.session]);
  return (
    <div style={{ height: '100vh', minHeight: 640 }}>
      <EditorHost session={editor.session} app={editor.app} navigation={navigation} />
    </div>
  );
}

const meta = {
  title: 'App/Component behavior',
  component: BehaviorPreview,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BehaviorPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ToggleState: Story = { args: { definition: toggleDemo } };
export const SortableList: Story = { args: { definition: sortableListDemo } };
