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

function BehaviorPreview() {
  const editor = useMemo(() => {
    const catalog = createExampleCatalog();
    const projectCatalog = {
      ...catalog,
      components: { ...catalog.components, [toggleDemo.uuid]: toggleDemo },
    };
    const session = createEditorSession({ projectCatalog });
    session.openAsset(toggleDemo.uuid, 'root');
    session.selectNode(toggleDemo.root.uuid);
    const app = createAppService({
      core: session.core,
      session,
      catalogPort: createInMemoryCatalogPort(() => session.core.getSnapshot().catalog),
    });
    return { app, session };
  }, []);
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
export const ToggleState: Story = {};
