import type { JsonSchemaObject, Node, NodeDefinition } from '@facadeur/domain';
import { facadeurHeader } from './header';
import { prop, uuid } from './shared';

const treeNodeUuid = uuid(5000);
const titleProp = prop(5001);
const itemsProp = prop(5002);
const repeaterUuid = uuid(5003);
const switchUuid = uuid(5004);
const componentCaseUuid = uuid(5005);
const groupCaseUuid = uuid(5006);
const groupChildrenRepeaterUuid = uuid(5010);
const groupedComponentUuid = uuid(5011);

const componentReferenceSchema = {
  type: 'string',
  title: 'Component',
  'x-facadeur-reference': { target: 'component' },
};
const labelSchema = { type: 'string', title: 'Label' };
const treeNodeSchema: JsonSchemaObject = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      title: 'Title',
      default: 'Component catalog',
      'x-facadeur-prop-id': titleProp,
    },
    items: {
      type: 'array',
      title: 'Items',
      default: [],
      'x-facadeur-prop-id': itemsProp,
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', title: 'Kind', enum: ['component', 'group'] },
          componentId: componentReferenceSchema,
          label: labelSchema,
          children: {
            type: 'array',
            title: 'Components',
            items: {
              type: 'object',
              properties: { componentId: componentReferenceSchema, label: labelSchema },
              required: ['componentId', 'label'],
              additionalProperties: false,
            },
          },
        },
        required: ['kind', 'label'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'items'],
  additionalProperties: false,
};

function dynamicComponentNode(
  nodeUuid: string,
  name: string,
  itemPath: string,
  compositionCase?: string,
): Node {
  return {
    uuid: nodeUuid,
    name,
    dom: { tagName: 'div' },
    data: { title: '{item:label}' },
    config: {
      definitionRefBinding: { kind: 'item', path: itemPath },
      ...(compositionCase ? { compositionCase } : {}),
    },
  };
}

const groupedComponents: Node = {
  uuid: groupCaseUuid,
  name: 'Component group',
  dom: {
    tagName: 'section',
    children: [
      { uuid: uuid(5008), name: 'Group label', dom: { tagName: 'h4', text: '{item:label}' } },
      {
        uuid: groupChildrenRepeaterUuid,
        name: 'Group items',
        dom: {
          tagName: 'ul',
          children: [
            {
              uuid: uuid(5012),
              name: 'Group item',
              dom: {
                tagName: 'li',
                children: [dynamicComponentNode(groupedComponentUuid, 'Component', 'componentId')],
              },
            },
          ],
        },
        config: { composition: { kind: 'repeater', source: { kind: 'item', path: 'children' } } },
      },
    ],
  },
  config: { compositionCase: 'group' },
};

export const facadeurTreeNode: NodeDefinition = {
  uuid: treeNodeUuid,
  name: 'Tree node',
  kind: 'component',
  schema: { kind: 'inline', schema: treeNodeSchema },
  config: {
    previewData: {
      fields: {
        title: 'Component catalog',
        items: [
          {
            kind: 'component',
            componentId: facadeurHeader.uuid,
            label: 'Header component',
          },
          {
            kind: 'group',
            label: 'Navigation components',
            children: [
              { componentId: facadeurHeader.uuid, label: 'Header variant' },
              { componentId: uuid(320), label: 'Left sidebar' },
            ],
          },
        ],
      },
    },
  },
  root: {
    uuid: uuid(5007),
    name: 'Tree node root',
    dom: {
      tagName: 'div',
      children: [
        { uuid: uuid(5009), name: 'Title', dom: { tagName: 'h3', text: `{props:${titleProp}}` } },
        {
          uuid: repeaterUuid,
          name: 'Items',
          dom: {
            tagName: 'ul',
            children: [
              {
                uuid: uuid(5013),
                name: 'Tree item',
                dom: {
                  tagName: 'li',
                  children: [
                    {
                      uuid: switchUuid,
                      name: 'Item kind',
                      dom: {
                        tagName: 'div',
                        children: [
                          dynamicComponentNode(
                            componentCaseUuid,
                            'Component item',
                            'componentId',
                            'component',
                          ),
                          groupedComponents,
                        ],
                      },
                      config: {
                        composition: { kind: 'switch', source: { kind: 'item', path: 'kind' } },
                      },
                    },
                  ],
                },
              },
            ],
          },
          config: {
            composition: { kind: 'repeater', source: { kind: 'prop', uuid: itemsProp } },
          },
        },
      ],
    },
  },
};
