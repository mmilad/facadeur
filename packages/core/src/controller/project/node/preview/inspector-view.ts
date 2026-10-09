import type { FieldValue, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { htmlTagOptions } from '../../../../document/html-tags';
import { fieldsFromJsonSchema } from '../../../../schema/json-schema-fields';
import type { FieldDefinition } from '../../../../schema/document';
import {
  classListFromNode,
  findNodeByUuid,
  resolveJsonSchemaForDefinition,
} from '../../catalog/ops';
import { inspectorInputsForNode } from '../config/inspector';
import { designPropOptions, type DesignPropOption } from './prop-ref';

export type InspectorFormValue = {
  definition: { name: string };
  node: {
    name: string;
    tagName: string;
    classList: string[];
    style: Record<string, string>;
    data: Record<string, string>;
  };
  previewData: Record<string, FieldValue>;
  nodeData: Record<string, FieldValue>;
};

export type InspectorFormField =
  | { type: 'section'; title: string; fields: InspectorFormField[] }
  | { type: 'text'; path: string; label: string; hint?: string }
  | { type: 'select'; path: string; label: string; options: readonly string[] }
  | { type: 'classList'; path: string; label: string; suggestions: readonly string[] }
  | {
      type: 'record';
      path: string;
      label: string;
      keyLabel?: string;
      valueLabel?: string;
      propBindValues?: boolean;
    }
  | {
      type: 'schemaField';
      path: string;
      field: FieldDefinition;
      label: string;
      propBindable?: boolean;
    };

export type InspectorFormModel = {
  nodeUuid: string;
  formValue: InspectorFormValue;
  fields: InspectorFormField[];
  propOptions: readonly DesignPropOption[];
};

function collectClassSuggestions(root: Node): string[] {
  const tokens = new Set<string>();
  const visit = (node: Node) => {
    for (const token of classListFromNode(node)) tokens.add(token);
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(root);
  return [...tokens].sort((left, right) => left.localeCompare(right));
}

function recordFromFieldValues(
  record: Readonly<Record<string, FieldValue>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      value === undefined || value === null
        ? ''
        : typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value),
    ]),
  );
}

function schemaFieldsForDefinition(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
): FieldDefinition[] {
  const schema = resolveJsonSchemaForDefinition(catalog, definition);
  if (!schema) return [];
  return fieldsFromJsonSchema(schema);
}

function schemaFieldSections(
  prefix: 'previewData' | 'nodeData',
  title: string,
  fields: FieldDefinition[],
): InspectorFormField | null {
  if (!fields.length) return null;
  return {
    type: 'section',
    title,
    fields: fields.map((field) => ({
      type: 'schemaField',
      path: `${prefix}.${field.name}`,
      field,
      label: field.schema?.title?.trim() || field.name,
      propBindable: prefix === 'nodeData',
    })),
  };
}

/** Declarative inspector layout + values for the open definition and selected node. */
export function buildInspectorFormModel(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
  nodeUuid: string,
): InspectorFormModel | null {
  const node = findNodeByUuid(definition.root, nodeUuid);
  if (!node) return null;

  const schemaFields = schemaFieldsForDefinition(catalog, definition);
  const classSuggestions = collectClassSuggestions(definition.root);
  const tagOptions = htmlTagOptions(node.dom.tagName);
  const nodeInputs = inspectorInputsForNode(catalog, definition, nodeUuid);
  const previewFields = definition.config?.previewData?.fields ?? {};

  const formValue: InspectorFormValue = {
    definition: { name: definition.name },
    node: {
      name: node.name ?? '',
      tagName: node.dom.tagName,
      classList: classListFromNode(node),
      style: { ...(node.style ?? {}) },
      data: recordFromFieldValues(node.data ?? {}),
    },
    previewData: { ...previewFields },
    nodeData: { ...nodeInputs.values },
  };

  const sections: InspectorFormField[] = [];
  if (nodeUuid === definition.root.uuid)
    sections.push({
      type: 'section',
      title: 'Asset',
      fields: [
        {
          type: 'text',
          path: 'definition.name',
          label: 'Name',
          hint: 'Catalog asset display name',
        },
      ],
    });

  if (nodeUuid !== definition.root.uuid) {
    sections.push({
      type: 'section',
      title: 'Element',
      fields: [
        { type: 'text', path: 'node.name', label: 'Name', hint: 'Layer label' },
        ...(!node.config?.definitionRef
          ? [
              {
                type: 'select' as const,
                path: 'node.tagName',
                label: 'Tag',
                options: tagOptions,
              },
            ]
          : []),
      ],
    });
  }

  const previewSection = schemaFieldSections('previewData', 'Preview defaults', schemaFields);
  if (previewSection) sections.push(previewSection);

  sections.push({
    type: 'section',
    title: 'Layout & style',
    fields: [
      {
        type: 'classList',
        path: 'node.classList',
        label: 'Classes',
        suggestions: classSuggestions,
      },
      {
        type: 'record',
        path: 'node.style',
        label: 'CSS',
        keyLabel: 'Property',
        valueLabel: 'Value',
        propBindValues: true,
      },
    ],
  });

  const propsSection = schemaFieldSections('nodeData', 'Properties', schemaFields);
  if (propsSection) {
    sections.push(propsSection);
  } else {
    sections.push({
      type: 'section',
      title: 'Properties',
      fields: [
        {
          type: 'record',
          path: 'node.data',
          label: 'Data',
          keyLabel: 'Key',
          valueLabel: 'Value',
          propBindValues: true,
        },
      ],
    });
  }

  return {
    nodeUuid,
    formValue,
    fields: sections,
    propOptions: designPropOptions(catalog),
  };
}

export type InspectorFormChangeTarget =
  | { kind: 'definitionName'; value: string }
  | { kind: 'nodeTagName'; nodeUuid: string; value: string }
  | { kind: 'nodeClassList'; nodeUuid: string; value: readonly string[] }
  | { kind: 'nodeStyle'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | { kind: 'nodeDataRecord'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | { kind: 'previewField'; field: string; value: FieldValue | undefined }
  | { kind: 'nodeSchemaField'; nodeUuid: string; field: string; value: FieldValue | undefined };

/** Map a form path + value to a typed catalog mutation target. */
export function inspectorChangeTarget(
  path: string,
  value: unknown,
  nodeUuid: string,
): InspectorFormChangeTarget | null {
  if (path === 'definition.name') {
    return { kind: 'definitionName', value: String(value ?? '').trim() };
  }
  if (path === 'node.tagName') {
    return { kind: 'nodeTagName', nodeUuid, value: String(value ?? '').trim() };
  }
  if (path === 'node.classList') {
    return {
      kind: 'nodeClassList',
      nodeUuid,
      value: Array.isArray(value) ? value.map(String) : [],
    };
  }
  if (path === 'node.style') {
    return {
      kind: 'nodeStyle',
      nodeUuid,
      value: (value ?? {}) as Record<string, string>,
    };
  }
  if (path === 'node.data') {
    return {
      kind: 'nodeDataRecord',
      nodeUuid,
      value: (value ?? {}) as Record<string, string>,
    };
  }
  if (path.startsWith('previewData.')) {
    const field = path.slice('previewData.'.length);
    if (!field) return null;
    return { kind: 'previewField', field, value: value as FieldValue | undefined };
  }
  if (path.startsWith('nodeData.')) {
    const field = path.slice('nodeData.'.length);
    if (!field) return null;
    return {
      kind: 'nodeSchemaField',
      nodeUuid,
      field,
      value: value as FieldValue | undefined,
    };
  }
  return null;
}
