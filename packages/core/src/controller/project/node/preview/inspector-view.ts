import type {
  FieldExposure,
  FieldValue,
  CompositionSource,
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
import { componentPropsForSchema } from '../../catalog/field-ids';
import { staticFieldValues } from './merge';
import { configFieldsForDefinition, schemaWithReferenceOptions } from './inspector-config-fields';
import { inspectorInputsForNode } from '../config/inspector';
import { designPropOptions, type DesignPropOption } from './prop-ref';
import {
  componentPropValues,
  computedIndexName,
  fieldAtPath,
  repeaterItemPath,
  repeaterItemPropBindings,
  repeaterItemSchema,
  resolveCatalogSchemaReferences,
  resolveReferenceValue,
  type RepeaterReferenceScope,
} from './reference-resolver';
import type { InspectorFormChangeTarget } from '../../inspector-form-change';

export type InspectorFormValue = {
  definition: {
    name: string;
  };
  node: {
    name: string;
    tagName?: string;
    text: string;
    classList: string[];
    data: Record<string, string>;
    compositionSource: string;
    compositionIndexName: string;
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
  const effective = effectiveSchemaForDefinition(catalog, definition);
  const ancestorNodes = findNodePath(definition.root, nodeUuid).slice(0, -1);
  const repeaterScopes = buildInspectorRepeaterScopes(
    ancestorNodes,
    effective.schema,
    { ...effective.previewDefaults },
    catalog,
    definition.behavior?.state,
    definition.behavior?.stateSchema,
  );
  const boundDefinitionRef = node.config?.definitionRefBinding
    ? fieldAtPath(repeaterScopes.at(-1)?.item, node.config.definitionRefBinding.path)
    : undefined;
  const resolvedBoundDefinitionRef =
    typeof boundDefinitionRef === 'string'
      ? resolveReferenceValue(boundDefinitionRef, {
          catalog,
          componentProps: componentPropValues(effective.schema, effective.previewDefaults),
          repeaterScopes,
        })
      : undefined;
  const definitionRef =
    node.config?.definitionRef ??
    (typeof resolvedBoundDefinitionRef === 'string'
      ? resolvedBoundDefinitionRef
      : typeof boundDefinitionRef === 'string'
        ? boundDefinitionRef
        : undefined);
  const referencedDefinition = definitionRef
    ? findDefinition(catalog, definitionRef)?.definition
    : undefined;
  const scopedDefinition = referencedDefinition ?? definition;
  const componentEffective =
    scopedDefinition === definition ? effective : effectiveSchemaForDefinition(catalog, definition);
  const scopedEffective =
    scopedDefinition === definition
      ? effective
      : effectiveSchemaForDefinition(catalog, scopedDefinition);
  const configFields =
    nodeUuid === definition.root.uuid ? configFieldsForDefinition(catalog, definition) : [];
  const resolvedSchema = scopedEffective.schema
    ? (resolveCatalogSchemaReferences(
        scopedEffective.schema,
        catalog,
      ) as typeof scopedEffective.schema)
    : null;
  const schemaFields = resolvedSchema
    ? fieldsFromJsonSchema(schemaWithReferenceOptions(resolvedSchema, catalog))
    : [];
  const classSuggestions = collectClassSuggestions(definition.root);
  const tagOptions = htmlTagOptions(node.dom.tagName ?? 'div');
  const itemPropBindings = referencedDefinition
    ? repeaterItemPropBindings(scopedEffective.schema, repeaterScopes)
    : [];
  const instanceValues = referencedDefinition
    ? {
        ...Object.fromEntries(itemPropBindings.map(({ path, ref }) => [path, ref])),
        ...(node.data ?? {}),
      }
    : undefined;
  const nodeInputs = inspectorInputsForNode(catalog, scopedDefinition, nodeUuid, instanceValues);
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
      ...(composition?.kind !== 'repeater' && node.dom.tagName
        ? { tagName: node.dom.tagName }
        : {}),
      text: node.dom.text ?? '',
      classList: classListFromNode(node),
      data: recordFromFieldValues(node.data ?? {}),
      compositionSource: compositionSourceSelection(compositionSource),
      compositionIndexName:
        composition?.kind === 'repeater'
          ? (composition.indexName ?? computedIndexName(repeaterScopes.length))
          : '',
      compositionCase: node.config?.compositionCase ?? '',
      definitionRefBindingPath: node.config?.definitionRefBinding?.path ?? '',
    },
    previewData: { ...previewFields },
    nodeData: { ...nodeInputs.values },
  };

  const sections: InspectorFormField[] = [];
  const parentNode = ancestorNodes.at(-1) ?? null;
  const isRepeater = composition?.kind === 'repeater';
  if (nodeUuid === definition.root.uuid && !isRepeater)
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
        ...(!node.config?.definitionRef && !isRepeater
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
                path: 'node.compositionSource',
                label: 'Source',
                options: [
                  { value: '', label: 'Choose an array or enum source…' },
                  ...compositionSourceOptions(
                    effectiveSchemaForDefinition(catalog, definition).schema,
                    composition.kind,
                    repeaterScopes,
                    definition.behavior?.stateSchema,
                  ),
                ],
              },
              ...(composition.kind === 'repeater'
                ? [
                    {
                      type: 'text' as const,
                      path: 'node.compositionIndexName',
                      label: 'Index name',
                      hint: 'Leave blank for the generated name.',
                    },
                  ]
                : []),
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

  if (node.dom.tagName && !isVoidHtmlTag(node.dom.tagName)) {
    sections.push({
      type: 'section',
      title: 'Content',
      fields: [{ type: 'text', path: 'node.text', label: 'Text content', bindable: true }],
    });
  }

  const previewSection = isRepeater
    ? null
    : schemaFieldSections('previewData', 'Preview defaults', schemaFields);
  if (previewSection) sections.push(previewSection);

  if (!isRepeater) {
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
  }

  const propsSection = schemaFieldSections('nodeData', 'Properties', schemaFields);
  if (isRepeater) {
    // Repeater nodes define item scopes; data belongs to the parent component or item.
  } else if (propsSection) {
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
    propOptions: designPropOptions(catalog, componentEffective.schema, repeaterScopes),
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
  if (path === 'node.compositionSource') {
    const selection = String(value ?? '').trim();
    const source = selection.startsWith('item:')
      ? { kind: 'item' as const, path: selection.slice('item:'.length) }
      : selection.startsWith('state:')
        ? { kind: 'state' as const, name: selection.slice('state:'.length) }
        : selection
          ? {
              kind: 'prop' as const,
              uuid: selection.startsWith('prop:') ? selection.slice('prop:'.length) : selection,
            }
          : null;
    return {
      kind: 'nodeComposition',
      nodeUuid,
      patch: { source },
    };
  }
  if (path === 'node.compositionIndexName') {
    const indexName = String(value ?? '').trim();
    return {
      kind: 'nodeComposition',
      nodeUuid,
      patch: { indexName: indexName || null },
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
  repeaterScopes: readonly RepeaterReferenceScope[],
  stateSchema?: Readonly<Record<string, Record<string, unknown>>>,
) {
  const properties = schema?.properties;
  const componentOptions =
    properties && typeof properties === 'object' && !Array.isArray(properties)
      ? Object.entries(properties as Record<string, unknown>).flatMap(([name, value]) => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
          const field = value as Record<string, unknown>;
          const uuid = field['x-facadeur-prop-id'];
          if (typeof uuid !== 'string' || !isCompositionSource(field, kind)) return [];
          return [
            {
              value: `prop:${uuid}`,
              label: `${String(field.title ?? name)} (${name})`,
            },
          ];
        })
      : [];
  const activeScope = repeaterScopes.at(-1);
  const itemOptions = activeScope
    ? componentPropsForSchema(activeScope.itemSchema).flatMap((prop) => {
        if (prop.name.includes('[].')) return [];
        const field = schemaAtPath(activeScope.itemSchema, prop.path);
        if (!field || !isCompositionSource(field, kind)) return [];
        const itemName = prop.name.replace(/^props\./, '');
        return [
          {
            value: `item:${prop.path}`,
            label: `${activeScope.indexName}.${itemName} (${prop.path})`,
          },
        ];
      })
    : [];
  const stateOptions =
    kind === 'repeater'
      ? Object.entries(stateSchema ?? {}).flatMap(([name, field]) =>
          isCompositionSource(field, kind)
            ? [{ value: `state:${name}`, label: `${name} (internal state)` }]
            : [],
        )
      : [];
  return [...componentOptions, ...itemOptions, ...stateOptions];
}

function compositionSourceSelection(
  source:
    | { kind: 'prop'; uuid: string }
    | { kind: 'item'; path: string }
    | { kind: 'state'; name: string }
    | undefined,
) {
  if (!source) return '';
  if (source.kind === 'prop') return `prop:${source.uuid}`;
  if (source.kind === 'state') return `state:${source.name}`;
  return `item:${source.path}`;
}

function isCompositionSource(field: Record<string, unknown>, kind: 'repeater' | 'switch') {
  if (kind === 'repeater') return field.type === 'array';
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
  return enumValues;
}

function schemaAtPath(schema: unknown, path: string): Record<string, unknown> | null {
  let current = schema;
  for (const segment of path.split('.').filter(Boolean)) {
    while (
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      (current as Record<string, unknown>).type === 'array'
    ) {
      current = (current as Record<string, unknown>).items;
    }
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    const properties = (current as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return null;
    current = (properties as Record<string, unknown>)[segment];
  }
  return current && typeof current === 'object' && !Array.isArray(current)
    ? (current as Record<string, unknown>)
    : null;
}

function findNodePath(root: Node, targetUuid: string): Node[] {
  const visit = (current: Node, path: Node[]): Node[] | null => {
    const nextPath = [...path, current];
    if (current.uuid === targetUuid) return nextPath;
    for (const child of current.dom.children ?? []) {
      const found = visit(child, nextPath);
      if (found) return found;
    }
    return null;
  };
  return visit(root, []) ?? [];
}

function buildInspectorRepeaterScopes(
  ancestors: readonly Node[],
  componentSchema: Record<string, unknown> | null,
  componentFields: Record<string, FieldValue>,
  catalog: ProjectCatalog,
  componentState?: Readonly<Record<string, FieldValue | null>>,
  stateSchema?: Readonly<Record<string, Record<string, unknown>>>,
): RepeaterReferenceScope[] {
  const scopes: RepeaterReferenceScope[] = [];
  for (const node of ancestors) {
    const composition = node.config?.composition;
    if (composition?.kind !== 'repeater') continue;
    const depth = scopes.length;
    scopes.push({
      nodeUuid: node.uuid,
      indexName: composition.indexName?.trim() || computedIndexName(depth),
      index: 0,
      itemPath: repeaterItemPath(composition.source, componentSchema, scopes),
      item: firstRepeaterItem(
        composition.source,
        componentSchema,
        componentFields,
        scopes,
        componentState,
      ),
      itemSchema: repeaterItemSchema(
        composition.source,
        componentSchema,
        scopes,
        catalog,
        stateSchema,
      ),
    });
  }
  return scopes;
}

function firstRepeaterItem(
  source: CompositionSource | undefined,
  componentSchema: Record<string, unknown> | null,
  componentFields: Readonly<Record<string, FieldValue>>,
  repeaterScopes: readonly RepeaterReferenceScope[],
  componentState?: Readonly<Record<string, FieldValue | null>>,
): FieldValue {
  if (!source) return {};
  if (source.kind === 'state') {
    const value = componentState?.[source.name];
    return Array.isArray(value) ? (value[0] ?? {}) : {};
  }
  const sourcePath =
    source.kind === 'prop'
      ? componentPropsForSchema(componentSchema).find((prop) => prop.uuid === source.uuid)?.path
      : source.path;
  if (!sourcePath) return {};
  const sourceValue =
    source.kind === 'prop'
      ? (fieldAtPath(componentFields as FieldValue, sourcePath) ??
        schemaAtPath(componentSchema, sourcePath)?.default)
      : (fieldAtPath(repeaterScopes.at(-1)?.item, sourcePath) ??
        schemaAtPath(repeaterScopes.at(-1)?.itemSchema, sourcePath)?.default);
  return Array.isArray(sourceValue) ? (sourceValue[0] ?? {}) : {};
}
