import type {
  FieldExposure,
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
import { configFieldsForDefinition, schemaWithReferenceOptions } from './inspector-config-fields';
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
    classList: string[];
    data: Record<string, string>;
    compositionSourceProp: string;
    compositionSourceItemPath: string;
    compositionCase: string;
    definitionRefBindingPath: string;
  };
  previewData: Record<string, FieldValue>;
  nodeData: Record<string, FieldValue>;
};

export type InspectorFormField =
  | { type: 'section'; title: string; fields: InspectorFormField[] }
  | { type: 'text'; path: string; label: string; hint?: string; bindable?: boolean }
  | {
      type: 'select';
      path: string;
      label: string;
      options: readonly { value: string; label: string }[];
    }
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
    readonly exposure?: FieldExposure;
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
  const scopedDefinition = referencedDefinition ?? definition;
  const effective = effectiveSchemaForDefinition(catalog, scopedDefinition);
  const componentEffective =
    scopedDefinition === definition ? effective : effectiveSchemaForDefinition(catalog, definition);
  const configFields =
    nodeUuid === definition.root.uuid ? configFieldsForDefinition(catalog, definition) : [];
  const schemaFields = effective.schema
    ? fieldsFromJsonSchema(schemaWithReferenceOptions(effective.schema, catalog))
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

  const composition = node.config?.composition;
  const compositionSource =
    composition && composition.kind !== 'slot' ? composition.source : undefined;
  const formValue: InspectorFormValue = {
    definition: {
      name: definition.name,
    },
    node: {
      name: node.name ?? '',
      tagName: node.dom.tagName,
      text: node.dom.text ?? '',
      classList: classListFromNode(node),
      data: recordFromFieldValues(node.data ?? {}),
      compositionSourceProp: compositionSource?.kind === 'prop' ? compositionSource.uuid : '',
      compositionSourceItemPath: compositionSource?.kind === 'item' ? compositionSource.path : '',
      compositionCase: node.config?.compositionCase ?? '',
      definitionRefBindingPath: node.config?.definitionRefBinding?.path ?? '',
    },
    previewData: { ...previewFields },
    nodeData: { ...nodeInputs.values },
  };

  const sections: InspectorFormField[] = [];
  const parentNode = findParentNode(definition.root, nodeUuid);
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
          options: tagOptions.map((value) => ({ value, label: value })),
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
                options: tagOptions.map((value) => ({ value, label: value })),
              },
            ]
          : []),
        ...(composition && composition.kind !== 'slot'
          ? [
              {
                type: 'select' as const,
                path: 'node.compositionSourceProp',
                label: 'Source prop',
                options: [
                  { value: '', label: 'Choose an array or enum prop…' },
                  ...compositionSourceOptions(
                    effectiveSchemaForDefinition(catalog, definition).schema,
                    composition.kind,
                  ),
                ],
              },
              {
                type: 'text' as const,
                path: 'node.compositionSourceItemPath',
                label: 'Item field path',
              },
            ]
          : []),
        ...(parentNode?.config?.composition?.kind === 'switch'
          ? [
              {
                type: 'text' as const,
                path: 'node.compositionCase',
                label: 'Switch case value',
              },
            ]
          : []),
        ...(node.config?.definitionRef || node.config?.definitionRefBinding
          ? [
              {
                type: 'text' as const,
                path: 'node.definitionRefBindingPath',
                label: 'Dynamic component item path',
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
    propOptions: designPropOptions(catalog, componentEffective.schema),
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
  const definitionExposureMatch =
    /^definition\.fieldExposure\.([0-9a-f-]{36})\.(mode|groupName|fields)$/.exec(path);
  if (definitionExposureMatch) {
    const [, instanceUuid, setting] = definitionExposureMatch;
    if (!instanceUuid || !setting) return null;
    if (setting === 'mode') {
      const mode = String(value ?? 'flat');
      if (mode !== 'flat' && mode !== 'grouped' && mode !== 'manual') return null;
      return { kind: 'nodeFieldExposureMode', nodeUuid: instanceUuid, mode };
    }
    if (setting === 'groupName') {
      return {
        kind: 'nodeFieldExposureGroupName',
        nodeUuid: instanceUuid,
        value: String(value ?? '').trim(),
      };
    }
    return {
      kind: 'nodeFieldExposureFields',
      nodeUuid: instanceUuid,
      value: (value ?? {}) as Record<string, string>,
    };
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
  if (path === 'node.compositionSourceProp') {
    const uuid = String(value ?? '').trim();
    return {
      kind: 'nodeComposition',
      nodeUuid,
      patch: { source: uuid ? { kind: 'prop', uuid } : null },
    };
  }
  if (path === 'node.compositionSourceItemPath') {
    const itemPath = String(value ?? '').trim();
    return {
      kind: 'nodeComposition',
      nodeUuid,
      patch: { source: itemPath ? { kind: 'item', path: itemPath } : null },
    };
  }
  if (path === 'node.compositionCase') {
    const caseValue = String(value ?? '').trim();
    return {
      kind: 'nodeComposition',
      nodeUuid,
      patch: { compositionCase: caseValue || null },
    };
  }
  if (path === 'node.definitionRefBindingPath') {
    const itemPath = String(value ?? '').trim();
    return {
      kind: 'nodeComposition',
      nodeUuid,
      patch: {
        definitionRefBinding: itemPath ? { kind: 'item', path: itemPath } : null,
      },
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

function compositionSourceOptions(
  schema: Record<string, unknown> | null,
  kind: 'repeater' | 'switch',
) {
  const properties = schema?.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
  return Object.entries(properties as Record<string, unknown>).flatMap(([name, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const field = value as Record<string, unknown>;
    const uuid = field['x-facadeur-prop-id'];
    const enumValues = Array.isArray(field.enum)
      ? true
      : Array.isArray(field.oneOf) &&
        field.oneOf.every(
          (branch) =>
            !!branch &&
            typeof branch === 'object' &&
            !Array.isArray(branch) &&
            typeof (branch as Record<string, unknown>).const === 'string',
        );
    const valid = kind === 'repeater' ? field.type === 'array' : enumValues;
    if (typeof uuid !== 'string' || !valid) return [];
    return [{ value: uuid, label: `${String(field.title ?? name)} (${name})` }];
  });
}

function findParentNode(root: Node, targetUuid: string): Node | null {
  for (const child of root.dom.children ?? []) {
    if (child.uuid === targetUuid) return root;
    const nested = findParentNode(child, targetUuid);
    if (nested) return nested;
  }
  return null;
}
