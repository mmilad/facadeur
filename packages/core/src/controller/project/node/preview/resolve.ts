import type {
  CompositionSource,
  FieldValue,
  Node,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import type { ElementBehaviorTarget, RenderBuildConfig } from '@facadeur/domain';
import {
  canAcceptCatalogChildren,
  defaultFieldExposure,
  effectiveSchemaForDefinition,
  findDefinition,
  inheritableSchemaForDefinition,
} from '../../../../queries';
import {
  compatibleNodeFieldValues,
  lockedStaticFieldValues,
  mergePreviewFields,
  staticFieldValues,
} from './merge';
import { effectiveClassList } from './class-conditions';
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

const MAX_DYNAMIC_DEFINITION_DEPTH = 32;

type ChildrenSlotContent = {
  nodes: readonly Node[];
  context: NodeResolveContext;
  parentSlotContent?: ChildrenSlotContent;
};

type NodeResolveContext = {
  definition: NodeDefinition;
  catalog: ProjectCatalog;
  parentFields: Record<string, FieldValue>;
  activeDefinitions: ReadonlySet<string>;
  inheritedOverrides: Record<string, FieldValue>;
  itemContext: FieldValue | undefined;
  repeaterScopes: readonly RepeaterReferenceScope[];
  dynamicDefinitionDepth: number;
  slotContent: ChildrenSlotContent | undefined;
  behaviorScopeKey: string;
  elementInstancePath: string;
  behaviorStateByInstance?: Readonly<Record<string, Readonly<Record<string, FieldValue | null>>>>;
  includeBehaviorTargets: boolean;
};

export interface PreviewResolutionOptions {
  readonly behaviorStateByInstance?: Readonly<
    Record<string, Readonly<Record<string, FieldValue | null>>>
  >;
  readonly includeBehaviorTargets?: boolean;
}

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
  options: PreviewResolutionOptions = {},
): RenderBuildConfig {
  return resolveNodeToElementBuildConfig(definition.root, {
    definition,
    catalog,
    parentFields,
    activeDefinitions: new Set([definition.uuid]),
    inheritedOverrides: {},
    itemContext: undefined,
    repeaterScopes: [],
    dynamicDefinitionDepth: 0,
    slotContent: undefined,
    behaviorScopeKey: definition.uuid,
    elementInstancePath: definition.uuid,
    behaviorStateByInstance: options.behaviorStateByInstance,
    includeBehaviorTargets: options.includeBehaviorTargets ?? false,
  });
}

function resolveNodeToElementBuildConfig(
  node: Node,
  context: NodeResolveContext,
): RenderBuildConfig {
  const {
    definition,
    catalog,
    parentFields,
    activeDefinitions,
    inheritedOverrides,
    itemContext,
    repeaterScopes,
    dynamicDefinitionDepth,
    slotContent,
  } = context;
  const instancePath = `${context.elementInstancePath}/${node.uuid}`;
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
      const nestedSlotContent = node.dom.children?.length
        ? {
            nodes: node.dom.children,
            context,
            ...(slotContent ? { parentSlotContent: slotContent } : {}),
          }
        : undefined;
      const built = resolveNodeToElementBuildConfig(refDefinition.root, {
        ...context,
        definition: refDefinition,
        parentFields: instanceFields,
        activeDefinitions: dynamicReference
          ? activeDefinitions
          : new Set(activeDefinitions).add(refDefinition.uuid),
        inheritedOverrides: instanceOverrides,
        dynamicDefinitionDepth: dynamicDefinitionDepth + (dynamicReference ? 1 : 0),
        slotContent: nestedSlotContent,
        behaviorScopeKey: instancePath,
        elementInstancePath: instancePath,
      });
      if (built.kind === 'fragment') return { ...built, nodeUuid: node.uuid };
      const styleNodeUuids = new Set(built.styleNodeUuids ?? []);
      if (built.nodeUuid) styleNodeUuids.add(built.nodeUuid);
      styleNodeUuids.add(node.uuid);
      const behaviorTargets = [
        ...(built.behaviorTargets ?? []),
        ...(behaviorTargetFor(context, definition, node, parentComponentProps, repeaterScopes) ??
          []),
      ];
      return {
        ...built,
        nodeUuid: node.uuid,
        styleNodeUuids: [...styleNodeUuids],
        ...(context.includeBehaviorTargets ? { instanceKey: instancePath } : {}),
        ...(behaviorTargets.length ? { behaviorTargets } : {}),
      };
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
    componentState:
      context.behaviorStateByInstance?.[context.behaviorScopeKey] ?? definition.behavior?.state,
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
          const rawQuery = composition.filter
            ? ctx.componentState?.[composition.filter.queryState]
            : undefined;
          const query = typeof rawQuery === 'string' ? rawQuery.trim().toLowerCase() : '';
          return value.flatMap((item, itemIndex) => {
            if (query && composition.filter) {
              const itemValue =
                item !== null && typeof item === 'object' && !Array.isArray(item)
                  ? fieldAtPath(item as FieldValue, composition.filter.itemPath)
                  : undefined;
              if (typeof itemValue !== 'string' || !itemValue.toLowerCase().includes(query))
                return [];
            }
            return childNodes.map((child, templateIndex) => {
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
                  definition.behavior?.stateSchema,
                ),
                itemPath: repeaterItemPath(composition.source, ctx.componentSchema, repeaterScopes),
              };
              const keyPath =
                composition.source?.kind === 'state'
                  ? definition.behavior?.stateArrayKeyPaths?.[composition.source.name]
                  : composition.keyPath;
              const itemKey = keyPath ? fieldAtPath(item, keyPath) : undefined;
              const stableKey =
                typeof itemKey === 'string' && itemKey.length > 0 ? itemKey : String(itemIndex);
              const resolved = resolveNodeToElementBuildConfig(child, {
                ...context,
                parentFields: fields,
                inheritedOverrides: fields,
                itemContext: item,
                repeaterScopes: [...repeaterScopes, scope],
                elementInstancePath: `${instancePath}/repeat:${encodeURIComponent(stableKey)}:${templateIndex}`,
              });
              return {
                ...resolved,
                renderKey: `${child.uuid}:${stableKey}:${templateIndex}`,
              };
            });
          });
        })()
      : composition?.kind === 'switch'
        ? (() => {
            const value = composition.source
              ? resolveCompositionSource(composition.source, ctx)
              : undefined;
            return childNodes
              .filter((child) => child.config?.compositionCase === String(value ?? ''))
              .map((child) =>
                resolveNodeToElementBuildConfig(child, {
                  ...context,
                  parentFields: fields,
                  inheritedOverrides: fields,
                  elementInstancePath: instancePath,
                }),
              );
          })()
        : composition?.kind === 'slot'
          ? slotContent
            ? slotContent.nodes.map((child) =>
                resolveNodeToElementBuildConfig(child, {
                  ...slotContent.context,
                  slotContent: slotContent.parentSlotContent,
                  elementInstancePath: `${instancePath}/slot:${child.uuid}`,
                }),
              )
            : []
          : childNodes.map((child) =>
              resolveNodeToElementBuildConfig(child, {
                ...context,
                parentFields: fields,
                inheritedOverrides: fields,
                elementInstancePath: instancePath,
              }),
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
    const itemSchema = composition.source
      ? repeaterItemSchema(
          composition.source,
          ctx.componentSchema,
          repeaterScopes,
          catalog,
          definition.behavior?.stateSchema,
        )
      : null;
    const currentItems = composition.source
      ? resolveCompositionSource(composition.source, ctx)
      : undefined;
    const sampleItem = Array.isArray(currentItems)
      ? (currentItems[0] ?? sampleForSchema(itemSchema?.items))
      : undefined;
    const templates = composition.source
      ? childNodes.map((child, templateIndex) => {
          const scope: RepeaterReferenceScope = {
            nodeUuid: node.uuid,
            indexName: composition.indexName?.trim() || computedIndexName(repeaterScopes.length),
            index: 0,
            item: sampleItem ?? {},
            itemSchema,
            itemPath: repeaterItemPath(composition.source, ctx.componentSchema, repeaterScopes),
          };
          return resolveNodeToElementBuildConfig(child, {
            ...context,
            parentFields: fields,
            inheritedOverrides: fields,
            itemContext: sampleItem,
            repeaterScopes: [...repeaterScopes, scope],
            elementInstancePath: `${instancePath}/repeat-template:${templateIndex}`,
          });
        })
      : undefined;
    return {
      kind: 'fragment',
      ...(resolvedChildren.length ? { children: resolvedChildren } : {}),
      nodeUuid: node.uuid,
      ...(composition.source && itemSchema
        ? {
            repeater: {
              source: composition.source,
              itemSchema,
              templates: templates ?? [],
              indexName: composition.indexName?.trim() || computedIndexName(repeaterScopes.length),
              ...(composition.source.kind !== 'state' && composition.keyPath
                ? { keyPath: composition.keyPath }
                : {}),
              ...(composition.filter ? { filter: composition.filter } : {}),
            },
          }
        : {}),
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
  const behaviorTargets = behaviorTargetFor(
    context,
    definition,
    node,
    ctx.componentProps,
    repeaterScopes,
  );

  return {
    tagName: node.dom.tagName ?? 'div',
    ...(text !== undefined ? { text } : {}),
    attributes,
    ...(node.dom.data ? { dataset: { ...node.dom.data } } : {}),
    ...(Object.keys(dynamicClassStyles).length ? { dynamicClassStyles } : {}),
    ...(properties && Object.keys(properties).length ? { properties } : {}),
    ...(resolvedChildren.length ? { children: resolvedChildren } : {}),
    nodeUuid: node.uuid,
    ...(context.includeBehaviorTargets
      ? {
          instanceKey: instancePath,
          ...(behaviorTargets ? { behaviorTargets } : {}),
        }
      : {}),
  };
}

function behaviorTargetFor(
  context: NodeResolveContext,
  definition: NodeDefinition,
  node: Node,
  props: Readonly<Record<string, FieldValue>> | undefined,
  repeaterScopes: readonly RepeaterReferenceScope[],
) {
  if (!context.includeBehaviorTargets) return undefined;
  const events = [
    ...new Set(
      (definition.behavior?.transitions ?? [])
        .filter((transition) => transition.nodeUuid === node.uuid)
        .map((transition) => transition.event),
    ),
  ];
  if (!events.length) return undefined;
  const target: ElementBehaviorTarget = {
    scopeKey: context.behaviorScopeKey,
    definitionUuid: definition.uuid,
    nodeUuid: node.uuid,
    events,
    ...(props ? { props } : {}),
    ...(repeaterScopes.length
      ? {
          repeaterIndices: Object.fromEntries(
            repeaterScopes.map((scope) => [scope.nodeUuid, scope.index]),
          ),
        }
      : {}),
  };
  return [target];
}

function sampleForSchema(schema: unknown): FieldValue | undefined {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return undefined;
  const record = schema as Record<string, unknown>;
  if (record.default !== undefined) return record.default as FieldValue;
  if (record.type === 'object') {
    const properties = record.properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return {};
    return Object.fromEntries(
      Object.entries(properties as Record<string, unknown>).map(([name, property]) => [
        name,
        sampleForSchema(property) ?? '',
      ]),
    );
  }
  if (record.type === 'array') return [];
  if (record.type === 'boolean') return false;
  if (record.type === 'number' || record.type === 'integer') return 0;
  return '';
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
  if (source.kind === 'state') return ctx.componentState?.[source.name];
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
