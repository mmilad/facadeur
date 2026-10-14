import type {
  FieldValue,
  Node,
  NodeDefinition,
  ProjectCatalog,
  StaticFieldConfig,
} from '@facadeur/domain';
import { htmlTagOptions, isVoidHtmlTag } from '../../../../document/html-tags';
import { fieldsFromJsonSchema } from '../../../../schema/json-schema-fields';
import type { JsonSchemaField } from '../../../../schema/json-schema-fields';
import { classListFromNode, findDefinition, findNodeByUuid } from '../../catalog/ops';
import { effectiveSchemaForDefinition } from '../../catalog/field-contract';
import { staticFieldValues } from './merge';
import { configFieldsForDefinition } from './inspector-config-fields';
import { inspectorInputsForNode } from '../config/inspector';
import { designPropOptions, type DesignPropOption } from './prop-ref';
import type { InspectorFormChangeTarget } from '../../inspector-form-change';

export type InspectorFormValue = {
  definition: {
    name: string;
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
      field: JsonSchemaField;
      label: string;
      propBindable?: boolean;
    };

export type InspectorFormModel = {
  nodeUuid: string;
  formValue: InspectorFormValue;
  fields: InspectorFormField[];
  configFields: readonly {
    readonly field: JsonSchemaField;
    readonly config?: StaticFieldConfig;
    readonly instanceUuid?: string;
    readonly instanceLabel?: string;
  }[];
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
  fields: JsonSchemaField[],
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
  const exposure = definition.config?.fieldExposure?.[node.uuid] ?? { mode: 'flat' as const };

  const scopedDefinition = referencedDefinition ?? definition;
  const effective = effectiveSchemaForDefinition(catalog, scopedDefinition);
  const configFields =
    nodeUuid === definition.root.uuid ? configFieldsForDefinition(catalog, definition) : [];
  const schemaFields = effective.schema
    ? fieldsFromJsonSchema(effective.schema).map((field) =>
        field.schema['x-facadeur-options-source'] === 'icons'
          ? {
              ...field,
              type: 'enum' as const,
              options: (catalog.icons ?? []).map((icon) => icon.id),
            }
          : field,
      )
    : [];
  const classSuggestions = collectClassSuggestions(definition.root);
  const tagOptions = htmlTagOptions(node.dom.tagName);
  const nodeInputs = inspectorInputsForNode(
    catalog,
    scopedDefinition,
    nodeUuid,
    referencedDefinition ? node.data : undefined,
  );
  const previewFields = { ...nodeInputs.values } as Record<string, FieldValue>;
  if (nodeUuid === definition.root.uuid) {
    Object.assign(previewFields, staticFieldValues(definition));
  }

  const formValue: InspectorFormValue = {
    definition: {
      name: definition.name,
    },
    node: {
      name: node.name ?? '',
      tagName: node.dom.tagName,
      text: node.dom.text ?? '',
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
        {
          type: 'select',
          path: 'node.tagName',
          label: 'Tag',
          options: tagOptions,
        },
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
    configFields,
    propOptions: designPropOptions(catalog, effective.schema),
  };
}

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
  const staticFieldMatch =
    /^definition\.staticFields\.([A-Za-z][A-Za-z0-9_-]*)\.(isStatic|value|expose)$/.exec(path);
  if (staticFieldMatch) {
    const [, field, setting] = staticFieldMatch;
    if (!field || !setting) return null;
    if (setting === 'isStatic' || setting === 'expose') {
      return {
        kind: 'definitionStaticField',
        field,
        setting,
        value: value === true,
      };
    }
    return {
      kind: 'definitionStaticField',
      field,
      setting: 'value',
      value: value as FieldValue,
    };
  }
  const instanceStaticFieldMatch =
    /^definition\.instanceFieldConfigs\.([0-9a-f-]{36})\.(.+)\.(isStatic|value|expose)$/.exec(path);
  if (instanceStaticFieldMatch) {
    const [, instanceUuid, field, setting] = instanceStaticFieldMatch;
    if (!instanceUuid || !field || !setting) return null;
    return {
      kind: 'definitionInstanceField',
      instanceUuid,
      field,
      setting: setting as 'isStatic' | 'value' | 'expose',
      value:
        setting === 'isStatic' || setting === 'expose' ? value === true : (value as FieldValue),
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
