import type { FieldValue, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { htmlTagOptions, isVoidHtmlTag } from '../../../../document/html-tags';
import { fieldsFromJsonSchema } from '../../../../schema/json-schema-fields';
import type { FieldDefinition } from '../../../../schema/document';
import { classListFromNode, findDefinition, findNodeByUuid } from '../../catalog/ops';
import { effectiveSchemaForDefinition } from '../../catalog/field-contract';
import { inspectorInputsForNode } from '../config/inspector';
import { designPropOptions, type DesignPropOption } from './prop-ref';

export type InspectorFormValue = {
  definition: {
    name: string;
    fieldExposureMode: 'flat' | 'grouped' | 'manual';
    fieldExposureFields: Record<string, string>;
  };
  node: {
    name: string;
    tagName: string;
    text: string;
    fieldExposureMode: 'flat' | 'grouped' | 'manual';
    fieldExposureGroupName: string;
    fieldExposureFields: Record<string, string>;
    classList: string[];
    style: Record<string, string>;
    data: Record<string, string>;
  };
  previewData: Record<string, FieldValue>;
  nodeData: Record<string, FieldValue>;
};

export type InspectorFormField =
  | { type: 'section'; title: string; fields: InspectorFormField[] }
  | { type: 'text'; path: string; label: string; hint?: string; bindable?: boolean }
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
  const referencedDefinition = node.config?.definitionRef
    ? findDefinition(catalog, node.config.definitionRef)?.definition
    : undefined;
  const exposure = node.config?.fieldExposure ??
    referencedDefinition?.config?.fieldExposure ?? { mode: 'flat' as const };

  const scopedDefinition = referencedDefinition ?? definition;
  const effective = effectiveSchemaForDefinition(catalog, scopedDefinition);
  const schemaFields = effective.schema ? fieldsFromJsonSchema(effective.schema) : [];
  const classSuggestions = collectClassSuggestions(definition.root);
  const tagOptions = htmlTagOptions(node.dom.tagName);
  const nodeInputs = inspectorInputsForNode(
    catalog,
    scopedDefinition,
    nodeUuid,
    referencedDefinition ? node.data : undefined,
  );
  const previewFields = { ...effective.previewDefaults } as Record<string, FieldValue>;

  const formValue: InspectorFormValue = {
    definition: {
      name: definition.name,
      fieldExposureMode: definition.config?.fieldExposure?.mode ?? 'flat',
      fieldExposureFields:
        definition.config?.fieldExposure?.mode === 'manual'
          ? { ...definition.config.fieldExposure.fields }
          : {},
    },
    node: {
      name: node.name ?? '',
      tagName: node.dom.tagName,
      text:
        node.dom.text ??
        (typeof node.dom.properties?.textContent === 'string'
          ? node.dom.properties.textContent
          : ''),
      classList: classListFromNode(node),
      style: { ...(node.style ?? {}) },
      data: recordFromFieldValues(node.data ?? {}),
      fieldExposureMode: exposure.mode,
      fieldExposureGroupName:
        exposure.mode === 'grouped'
          ? (exposure.groupName ?? node.name ?? referencedDefinition?.name ?? '')
          : (node.name ?? referencedDefinition?.name ?? ''),
      fieldExposureFields: exposure.mode === 'manual' ? { ...exposure.fields } : {},
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
        ...(definition.kind === 'atom'
          ? [
              {
                type: 'select' as const,
                path: 'definition.fieldExposure.mode',
                label: 'Default field exposure',
                options: ['flat', 'grouped', 'manual'],
              },
              ...(definition.config?.fieldExposure?.mode === 'manual'
                ? [
                    {
                      type: 'record' as const,
                      path: 'definition.fieldExposure.fields',
                      label: 'Default field mapping',
                      keyLabel: 'Atom field',
                      valueLabel: 'Exposed field',
                    },
                  ]
                : []),
            ]
          : []),
      ],
    });

  if (nodeUuid !== definition.root.uuid) {
    const targetDefinition = referencedDefinition;
    sections.push({
      type: 'section',
      title: 'Element',
      fields: [
        { type: 'text', path: 'node.name', label: 'Name', hint: 'Layer label' },
        ...(targetDefinition
          ? [
              {
                type: 'select' as const,
                path: 'node.fieldExposure.mode',
                label: 'Exposed fields',
                options: ['flat', 'grouped', 'manual'],
              },
              ...(exposure.mode === 'grouped'
                ? [
                    {
                      type: 'text' as const,
                      path: 'node.fieldExposure.groupName',
                      label: 'Group name',
                    },
                  ]
                : []),
              ...(exposure.mode === 'manual'
                ? [
                    {
                      type: 'record' as const,
                      path: 'node.fieldExposure.fields',
                      label: 'Field mapping',
                      keyLabel: 'Child field',
                      valueLabel: 'Parent field',
                    },
                  ]
                : []),
            ]
          : []),
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

  if (!isVoidHtmlTag(node.dom.tagName)) {
    sections.push({
      type: 'section',
      title: 'Content',
      fields: [{ type: 'text', path: 'node.text', label: 'Text content', bindable: true }],
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
    propOptions: designPropOptions(catalog, effective.schema),
  };
}

export type InspectorFormChangeTarget =
  | { kind: 'definitionName'; value: string }
  | { kind: 'definitionFieldExposureMode'; mode: 'flat' | 'grouped' | 'manual' }
  | { kind: 'definitionFieldExposureFields'; value: Readonly<Record<string, string>> }
  | { kind: 'nodeTagName'; nodeUuid: string; value: string }
  | { kind: 'nodeText'; nodeUuid: string; value: string }
  | { kind: 'nodeClassList'; nodeUuid: string; value: readonly string[] }
  | { kind: 'nodeStyle'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | { kind: 'nodeDataRecord'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | { kind: 'nodeFieldExposureMode'; nodeUuid: string; mode: 'flat' | 'grouped' | 'manual' }
  | { kind: 'nodeFieldExposureGroupName'; nodeUuid: string; value: string }
  | { kind: 'nodeFieldExposureFields'; nodeUuid: string; value: Readonly<Record<string, string>> }
  | {
      kind: 'previewField';
      definitionUuid: string;
      field: string;
      value: FieldValue | undefined;
    }
  | { kind: 'nodeSchemaField'; nodeUuid: string; field: string; value: FieldValue | undefined };

/** Map a form path + value to a typed catalog mutation target. */
export function inspectorChangeTarget(
  path: string,
  value: unknown,
  nodeUuid: string,
  previewDefinitionUuid = nodeUuid,
): InspectorFormChangeTarget | null {
  if (path === 'definition.name') {
    return { kind: 'definitionName', value: String(value ?? '').trim() };
  }
  if (path === 'definition.fieldExposure.mode') {
    const mode = String(value ?? 'flat');
    if (mode !== 'flat' && mode !== 'grouped' && mode !== 'manual') return null;
    return { kind: 'definitionFieldExposureMode', mode };
  }
  if (path === 'definition.fieldExposure.fields') {
    return {
      kind: 'definitionFieldExposureFields',
      value: (value ?? {}) as Record<string, string>,
    };
  }
  if (path === 'node.tagName') {
    return { kind: 'nodeTagName', nodeUuid, value: String(value ?? '').trim() };
  }
  if (path === 'node.text') {
    return { kind: 'nodeText', nodeUuid, value: String(value ?? '') };
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
  if (path === 'node.fieldExposure.mode') {
    const mode = String(value ?? 'flat');
    if (mode !== 'flat' && mode !== 'grouped' && mode !== 'manual') return null;
    return { kind: 'nodeFieldExposureMode', nodeUuid, mode };
  }
  if (path === 'node.fieldExposure.groupName') {
    return { kind: 'nodeFieldExposureGroupName', nodeUuid, value: String(value ?? '').trim() };
  }
  if (path === 'node.fieldExposure.fields') {
    return {
      kind: 'nodeFieldExposureFields',
      nodeUuid,
      value: (value ?? {}) as Record<string, string>,
    };
  }
  if (path.startsWith('previewData.')) {
    const field = path.slice('previewData.'.length);
    if (!field) return null;
    return {
      kind: 'previewField',
      definitionUuid: previewDefinitionUuid,
      field,
      value: value as FieldValue | undefined,
    };
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
