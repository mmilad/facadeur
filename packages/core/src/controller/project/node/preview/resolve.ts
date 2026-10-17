import type {
  CompositionSource,
  FieldValue,
  Node,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import type { RenderBuildConfig } from '@facadeur/domain';
import { findDefinition } from '../../catalog/ops';
import {
  compatibleNodeFieldValues,
  lockedStaticFieldValues,
  mergePreviewFields,
  staticFieldValues,
} from './merge';
import {
  defaultFieldExposure,
  effectiveSchemaForDefinition,
  inheritableSchemaForDefinition,
} from '../../catalog/field-contract';
import { canAcceptCatalogChildren } from '../../catalog/tree-ops';
import { effectiveClassList, evaluateClassCondition } from './class-conditions';
import {
  componentPropValues,
  computedIndexName,
  fieldAtPath,
  isSupportedReference,
  repeaterItemPath,
  repeaterItemPropBindings,
  repeaterItemSchema,
  resolveCatalogSchemaReferences,
  resolveReferenceValue,
  resolveReferenceText,
  type RepeaterReferenceScope,
} from './reference-resolver';

/** Merged field layers + catalog context for binding resolution. */
export type PreviewResolveContext = {
  readonly catalog: ProjectCatalog;
  readonly fields: Record<string, FieldValue>;
  readonly overrides?: Record<string, FieldValue>;
  readonly componentProps?: Readonly<Record<string, FieldValue>>;
  readonly componentState?: Readonly<Record<string, FieldValue | null>>;
  readonly componentSchema?: Record<string, unknown> | null;
  readonly item?: FieldValue;
  readonly repeaterScopes?: readonly RepeaterReferenceScope[];
};

const STYLE_REFERENCE = /^\{props:[^}]+\}$/;
const MAX_DYNAMIC_DEFINITION_DEPTH = 32;

type ChildrenSlotContent = {
  nodes: readonly Node[];
  definition: NodeDefinition;
  fields: Record<string, FieldValue>;
  activeDefinitions: ReadonlySet<string>;
  inheritedOverrides: Record<string, FieldValue>;
  itemContext: FieldValue | undefined;
  repeaterScopes: readonly RepeaterReferenceScope[];
  dynamicDefinitionDepth: number;
  parentSlotContent?: ChildrenSlotContent;
};

/** Replace `{prop:uuid}` and similar templates with literal strings for renderers. */
export function resolveTemplateString(template: string, ctx: PreviewResolveContext): string {
  return isSupportedReference(template) ? resolveReferenceText(template, ctx) : template;
}

function resolveStringRecord(
  record: Readonly<Record<string, string>> | undefined,
  ctx: PreviewResolveContext,
): Record<string, string> | undefined {
  if (!record) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const explicitValue = ctx.overrides?.[key];
    if (explicitValue !== undefined && explicitValue !== null && explicitValue !== '') {
      out[key] = resolveTemplateString(stringField(explicitValue) ?? value, ctx);
      continue;
    }
    const propValue = resolveTemplateString(value, ctx);
    if (propValue !== value) {
      out[key] = propValue;
      continue;
    }
    const fieldOverride = ctx.fields[key];
    if (fieldOverride !== undefined && fieldOverride !== null && fieldOverride !== '') {
      out[key] = stringField(fieldOverride) ?? value;
    } else {
      out[key] = propValue;
    }
  }
  return out;
}

function stringField(value: FieldValue | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function textFromNode(
  node: Node,
  fields: Record<string, FieldValue>,
  ctx: PreviewResolveContext,
): string | undefined {
  const fieldText = stringField(fields.text);
  const source = fieldText ?? node.dom.text;
  return source === undefined ? undefined : resolveTemplateString(source, ctx);
}

/**
 * Walk a definition tree: merge field layers, resolve bindings, and expand Catalog composition.
 * Keep this independent of the renderer so preview and code generation share the resolved tree.
 */
export function resolveDefinitionToElementBuildConfig(
  definition: NodeDefinition,
  catalog: ProjectCatalog,
  parentFields: Record<string, FieldValue> = {},
): RenderBuildConfig {
  return resolveNodeToElementBuildConfig(
    definition.root,
    definition,
    catalog,
    parentFields,
    new Set([definition.uuid]),
    {},
    undefined,
    [],
    0,
    undefined,
  );
}

function resolveNodeToElementBuildConfig(
  node: Node,
  definition: NodeDefinition,
  catalog: ProjectCatalog,
  parentFields: Record<string, FieldValue>,
  activeDefinitions: ReadonlySet<string>,
  inheritedOverrides: Record<string, FieldValue>,
  itemContext: FieldValue | undefined,
  repeaterScopes: readonly RepeaterReferenceScope[],
  dynamicDefinitionDepth: number,
  slotContent: ChildrenSlotContent | undefined,
): RenderBuildConfig {
  const boundDefinitionRef = node.config?.definitionRefBinding
    ? fieldAtPath(itemContext, node.config.definitionRefBinding.path)
    : undefined;
  const definitionRef =
    node.config?.definitionRef ??
    (typeof boundDefinitionRef === 'string' ? boundDefinitionRef : undefined);
  if (definitionRef) {
    const located = findDefinition(catalog, definitionRef);
    if (located) {
      const refDefinition = located.definition;
      if (node.dom.children?.length && !canAcceptCatalogChildren(node, catalog)) {
        throw new Error(
          `Component instance "${node.name ?? node.uuid}" has child layers, but its target does not provide a Children slot`,
        );
      }
      const dynamicReference = Boolean(node.config?.definitionRefBinding);
      if (dynamicReference && dynamicDefinitionDepth >= MAX_DYNAMIC_DEFINITION_DEPTH) {
        throw new Error(
          `Dynamic component reference exceeded the ${MAX_DYNAMIC_DEFINITION_DEPTH}-level preview limit at "${node.name ?? node.uuid}"`,
        );
      }
      if (activeDefinitions.has(refDefinition.uuid) && !dynamicReference) {
        throw new Error(`Cyclic catalog definition reference at "${refDefinition.uuid}"`);
      }
      const parentSchema = effectiveSchemaForDefinition(catalog, definition).schema;
      const targetEffective = effectiveSchemaForDefinition(catalog, refDefinition);
      const exposure =
        definition.config?.fieldExposure?.[node.uuid] ??
        defaultFieldExposure(
          new Set(Object.keys(parentSchema?.properties ?? {})),
          inheritableSchemaForDefinition(catalog, refDefinition)?.properties ?? {},
          node.name || refDefinition.name,
        );
      const instanceFieldConfigs = definition.config?.instanceFieldConfigs?.[node.uuid] ?? {};
      const parentComponentProps = componentPropValues(parentSchema, parentFields);
      const repeaterItemBindings = Object.fromEntries(
        repeaterItemPropBindings(targetEffective.schema, repeaterScopes).map(({ path, ref }) => [
          path,
          ref,
        ]),
      );
      const repeaterItemValues =
        resolveParentPropBindings(repeaterItemBindings, {
          catalog,
          componentProps: parentComponentProps,
          repeaterScopes,
        }) ?? {};
      const instancePreviewData = resolveParentPropBindings(
        node.config?.previewData?.fields as Record<string, FieldValue> | undefined,
        { catalog, componentProps: parentComponentProps, repeaterScopes },
      );
      const instanceData = resolveParentPropBindings(
        node.data as Record<string, FieldValue> | undefined,
        { catalog, componentProps: parentComponentProps, repeaterScopes },
      );
      const hiddenStaticFields = new Set([
        ...staticFieldsNotExposed(refDefinition),
        ...Object.entries(instanceFieldConfigs)
          .filter(([, config]) => config.isStatic && config.expose !== true)
          .map(([field]) => field),
      ]);
      const inheritedFields = omitFields(parentFields, hiddenStaticFields);
      const exposureValues =
        exposure.mode === 'grouped'
          ? omitFields(
              objectField(inheritedFields[exposure.groupName || node.name || refDefinition.name]),
              hiddenStaticFields,
            )
          : exposure.mode === 'manual'
            ? omitMappedFields(
                valuesMappedToChildFields(parentFields, exposure.fields),
                hiddenStaticFields,
                exposure.fields,
              )
            : inheritedFields;
      const instanceFields = {
        ...targetEffective.previewDefaults,
        ...omitFields(repeaterItemValues, hiddenStaticFields),
        ...omitFields(instancePreviewData, staticFieldNames(refDefinition)),
        ...omitFields(instanceData, hiddenStaticFields),
        ...inheritedFields,
        ...exposureValues,
      };
      for (const [field, config] of Object.entries(instanceFieldConfigs)) {
        if (!config.isStatic || config.value === undefined) continue;
        if (config.expose !== true || !hasFieldPath(exposureValues, field)) {
          instanceFields[field] = config.value;
        }
      }
      const instanceOverrides = {
        ...omitFields(repeaterItemValues, hiddenStaticFields),
        ...omitFields(instancePreviewData, staticFieldNames(refDefinition)),
        ...omitFields(instanceData, hiddenStaticFields),
        ...inheritedFields,
        ...exposureValues,
      };
      for (const field of hiddenStaticFields) delete instanceOverrides[field];
      for (const [field, config] of Object.entries(instanceFieldConfigs)) {
        if (config.isStatic && config.expose !== true) delete instanceOverrides[field];
      }
      const built = resolveNodeToElementBuildConfig(
        refDefinition.root,
        refDefinition,
        catalog,
        instanceFields,
        dynamicReference ? activeDefinitions : new Set(activeDefinitions).add(refDefinition.uuid),
        instanceOverrides,
        itemContext,
        repeaterScopes,
        dynamicDefinitionDepth + (dynamicReference ? 1 : 0),
        node.dom.children?.length
          ? {
              nodes: node.dom.children,
              definition,
              fields: parentFields,
              activeDefinitions,
              inheritedOverrides,
              itemContext,
              repeaterScopes,
              dynamicDefinitionDepth,
              ...(slotContent ? { parentSlotContent: slotContent } : {}),
            }
          : undefined,
      );
      if (built.kind === 'fragment') return { ...built, nodeUuid: node.uuid };
      const styleNodeUuids = new Set(built.styleNodeUuids ?? []);
      if (built.nodeUuid) styleNodeUuids.add(built.nodeUuid);
      styleNodeUuids.add(node.uuid);
      return { ...built, nodeUuid: node.uuid, styleNodeUuids: [...styleNodeUuids] };
    }
  }

  const definitionPreview = definition.config?.previewData?.fields ?? {};
  const effective = effectiveSchemaForDefinition(catalog, definition);
  const resolvedSchema = resolveCatalogSchemaReferences(effective.schema, catalog) as Record<
    string,
    unknown
  > | null;
  const nodeData = compatibleNodeFieldValues(
    node.data as Record<string, FieldValue> | undefined,
    resolvedSchema,
  );
  const fields = mergePreviewFields(
    { ...(definitionPreview as Record<string, FieldValue>), ...staticFieldValues(definition) },
    nodeData,
    parentFields,
    resolvedSchema,
  );
  Object.assign(fields, lockedStaticFieldValues(definition));
  const nodeOverrides = {
    ...inheritedOverrides,
    ...nodeData,
  };
  for (const field of staticFieldsNotExposed(definition)) delete nodeOverrides[field];
  const ctx: PreviewResolveContext = {
    catalog,
    fields,
    componentProps: componentPropValues(resolvedSchema, fields),
    componentState: definition.behavior?.state,
    componentSchema: resolvedSchema,
    overrides: nodeOverrides,
    item: itemContext,
    repeaterScopes,
  };

  const text = textFromNode(node, fields, ctx);
  const attributes = resolveStringRecord(node.dom.attributes, ctx) ?? {};
  const classList = effectiveClassList(node, ctx);
  if (classList.length) attributes.class = classList.join(' ');
  else delete attributes.class;
  const iconId = node.dom.tagName?.toLowerCase() === 'svg' ? attributes['data-icon'] : undefined;
  const icon = iconId ? catalog.icons?.find((entry) => entry.id === iconId) : undefined;
  const composition = node.config?.composition;
  const childNodes = node.dom.children ?? [];
  const children =
    composition?.kind === 'repeater'
      ? (() => {
          const value = composition.source
            ? resolveCompositionSource(composition.source, ctx)
            : undefined;
          if (!Array.isArray(value)) return [];
          return value.flatMap((item, itemIndex) =>
            childNodes.map((child, templateIndex) => {
              const scope: RepeaterReferenceScope = {
                nodeUuid: node.uuid,
                indexName:
                  composition.indexName?.trim() || computedIndexName(repeaterScopes.length),
                index: itemIndex,
                item,
                itemSchema: repeaterItemSchema(
                  composition.source,
                  ctx.componentSchema,
                  repeaterScopes,
                  catalog,
                ),
                itemPath: repeaterItemPath(composition.source, ctx.componentSchema, repeaterScopes),
              };
              const resolved = resolveNodeToElementBuildConfig(
                child,
                definition,
                catalog,
                fields,
                activeDefinitions,
                fields,
                item,
                [...repeaterScopes, scope],
                dynamicDefinitionDepth,
                slotContent,
              );
              return {
                ...resolved,
                renderKey: `${child.uuid}:${itemIndex}:${templateIndex}`,
              };
            }),
          );
        })()
      : composition?.kind === 'switch'
        ? (() => {
            const value = composition.source
              ? resolveCompositionSource(composition.source, ctx)
              : undefined;
            return childNodes
              .filter((child) => child.config?.compositionCase === String(value ?? ''))
              .map((child) =>
                resolveNodeToElementBuildConfig(
                  child,
                  definition,
                  catalog,
                  fields,
                  activeDefinitions,
                  fields,
                  itemContext,
                  repeaterScopes,
                  dynamicDefinitionDepth,
                  slotContent,
                ),
              );
          })()
        : composition?.kind === 'slot'
          ? slotContent
            ? slotContent.nodes.map((child) =>
                resolveNodeToElementBuildConfig(
                  child,
                  slotContent.definition,
                  catalog,
                  slotContent.fields,
                  slotContent.activeDefinitions,
                  slotContent.inheritedOverrides,
                  slotContent.itemContext,
                  slotContent.repeaterScopes,
                  slotContent.dynamicDefinitionDepth,
                  slotContent.parentSlotContent,
                ),
              )
            : []
          : childNodes.map((child) =>
              resolveNodeToElementBuildConfig(
                child,
                definition,
                catalog,
                fields,
                activeDefinitions,
                fields,
                itemContext,
                repeaterScopes,
                dynamicDefinitionDepth,
                slotContent,
              ),
            );
  const resolvedChildren =
    node.dom.tagName?.toLowerCase() === 'svg' && icon
      ? icon.data.paths.map((path, index) => ({
          tagName: 'path',
          attributes: { d: path },
          nodeUuid: `${node.uuid}-path-${index}`,
        }))
      : children;

  if (icon) {
    delete attributes['data-icon'];
    attributes.viewBox = icon.data.viewBox;
  }
  if (composition?.kind === 'repeater') {
    return {
      kind: 'fragment',
      ...(resolvedChildren.length ? { children: resolvedChildren } : {}),
      nodeUuid: node.uuid,
    };
  }
  const classes = node.classes ?? [];
  const orderedClasses = [
    ...classes.filter((item) => item.generated),
    ...classes.filter((item) => !item.generated),
  ];
  const dynamicClassStyles = Object.fromEntries(
    orderedClasses.flatMap((item) => {
      const declarations = item.style?.declarations ?? {};
      const resolved = resolveStringRecord(declarations, ctx);
      return resolved && Object.keys(resolved).length ? [[item.name, resolved]] : [];
    }),
  );
  const properties = node.dom.properties;

  return {
    tagName: node.dom.tagName ?? 'div',
    ...(text !== undefined ? { text } : {}),
    attributes,
    ...(node.dom.data ? { dataset: { ...node.dom.data } } : {}),
    ...(Object.keys(dynamicClassStyles).length ? { dynamicClassStyles } : {}),
    ...(properties && Object.keys(properties).length ? { properties } : {}),
    ...(resolvedChildren.length ? { children: resolvedChildren } : {}),
    nodeUuid: node.uuid,
  };
}

function staticFieldNames(definition: NodeDefinition) {
  return new Set(
    Object.entries(definition.config?.staticFields ?? {})
      .filter(([, field]) => field.isStatic)
      .map(([name]) => name),
  );
}

function staticFieldsNotExposed(definition: NodeDefinition) {
  return new Set(
    Object.entries(definition.config?.staticFields ?? {})
      .filter(([, field]) => field.isStatic && field.expose !== true)
      .map(([name]) => name),
  );
}

function omitFields(
  values: Readonly<Record<string, FieldValue>> | undefined,
  fields: ReadonlySet<string>,
) {
  return Object.fromEntries(Object.entries(values ?? {}).filter(([name]) => !fields.has(name)));
}

function omitMappedFields(
  values: Record<string, FieldValue>,
  hiddenFields: ReadonlySet<string>,
  mapping: Readonly<Record<string, string>>,
) {
  const hiddenAliases = new Set(
    Object.entries(mapping)
      .filter(([source]) => hiddenFields.has(source.split('.')[0]!))
      .map(([, alias]) => alias),
  );
  return omitFields(values, hiddenAliases);
}

function hasFieldPath(values: Readonly<Record<string, FieldValue>>, path: string) {
  let current: FieldValue | undefined = values;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return false;
    current = current[segment];
  }
  return current !== undefined;
}

function resolveCompositionSource(
  source: CompositionSource | undefined,
  ctx: PreviewResolveContext,
) {
  if (!source) return undefined;
  if (source.kind === 'item') return fieldAtPath(ctx.item, source.path);
  return ctx.componentProps?.[source.uuid];
}

function resolveParentPropBindings(
  fields: Readonly<Record<string, FieldValue>> | undefined,
  context: {
    catalog: ProjectCatalog;
    componentProps: Readonly<Record<string, FieldValue>>;
    repeaterScopes: readonly RepeaterReferenceScope[];
  },
) {
  if (!fields) return undefined;
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [name, resolveParentPropBinding(value, context)]),
  );
}

function resolveParentPropBinding(
  value: FieldValue,
  context: {
    catalog: ProjectCatalog;
    componentProps: Readonly<Record<string, FieldValue>>;
    repeaterScopes: readonly RepeaterReferenceScope[];
  },
): FieldValue {
  if (typeof value === 'string') {
    if (!isSupportedReference(value)) return value;
    const resolved = resolveReferenceValue(value, context);
    return resolved === undefined ? value : (resolved as FieldValue);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveParentPropBinding(entry, context));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, entry]) => [
        name,
        resolveParentPropBinding(entry, context),
      ]),
    );
  }
  return value;
}

function objectField(value: FieldValue | undefined): Record<string, FieldValue> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

function valuesMappedToChildFields(
  parentFields: Record<string, FieldValue>,
  mapping: Readonly<Record<string, string>>,
) {
  const output: Record<string, FieldValue> = {};
  for (const [sourcePath, parentField] of Object.entries(mapping)) {
    const value = parentFields[parentField];
    if (value === undefined) continue;
    const segments = sourcePath.split('.').filter(Boolean);
    if (!segments.length) continue;
    let current = output;
    for (const segment of segments.slice(0, -1)) {
      const nested = current[segment];
      if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, FieldValue>;
    }
    current[segments[segments.length - 1]!] = value;
  }
  return output;
}
