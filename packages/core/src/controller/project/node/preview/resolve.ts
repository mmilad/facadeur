import type { FieldValue, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import type { ElementBuildConfig } from '@facadeur/domain';
import { findDefinition } from '../../catalog/ops';
import { lockedStaticFieldValues, mergePreviewFields, staticFieldValues } from './merge';
import { effectiveSchemaForDefinition } from '../../catalog/field-contract';
import { componentPropsForSchema } from '../../catalog/field-ids';
import { readTokenTree } from '../../../style/tokens/global/tree';
import { tokenReference } from '../../../style/tokens/syntax';

/** Merged field layers + catalog context for binding resolution. */
export type PreviewResolveContext = {
  readonly catalog: ProjectCatalog;
  readonly fields: Record<string, FieldValue>;
  readonly overrides?: Record<string, FieldValue>;
  readonly componentProps?: Readonly<Record<string, FieldValue>>;
};

const PROP_REF = /^\{prop:([^}]+)\}$/;
const COMPONENT_PROP_REF = /^\{props:([^}]+)\}$/;
const STYLE_REFERENCE = /^\{props:[^}]+\}$/;

/** Replace `{prop:uuid}` and similar templates with literal strings for renderers. */
export function resolveTemplateString(template: string, ctx: PreviewResolveContext): string {
  const match = template.match(PROP_REF);
  if (match) {
    const uuid = match[1];
    const prop = uuid ? ctx.catalog.props?.[uuid] : undefined;
    if (prop?.value) return prop.value;
  }
  const componentMatch = template.match(COMPONENT_PROP_REF);
  if (componentMatch) {
    const value = componentMatch[1] ? ctx.componentProps?.[componentMatch[1]] : undefined;
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return template;
  }
  return template;
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
  resolveTokenText: (value: string) => string,
): string | undefined {
  const fieldText = stringField(fields.text);
  const source = fieldText ?? node.dom.text;
  return source === undefined ? undefined : resolveTokenText(resolveTemplateString(source, ctx));
}

function createTokenTextResolver(tokenTree: unknown) {
  const tokensByUuid = readTokenTree(tokenTree).tokens;

  function resolveUuid(uuid: string, activeUuids: ReadonlySet<string>): string | undefined {
    const token = tokensByUuid.get(uuid);
    if (!token || activeUuids.has(uuid)) return undefined;
    const nextActiveUuids = new Set(activeUuids).add(uuid);
    if (typeof token.value === 'string') {
      const alias = tokenReference(token.value);
      if (alias) return resolveUuid(alias, nextActiveUuids);
      return token.value;
    }
    if (typeof token.value === 'number' || typeof token.value === 'boolean') {
      return String(token.value);
    }
    return JSON.stringify(token.value) ?? '';
  }

  return (value: string) => {
    const uuid = tokenReference(value);
    if (!uuid) return value;
    return resolveUuid(uuid, new Set()) ?? '';
  };
}

/**
 * Walk a definition tree: merge field layers, resolve bindings, emit renderer-ready configs.
 * Repeaters / definitionRef expansion belong here later — not in the rendering component.
 */
export function resolveDefinitionToElementBuildConfig(
  definition: NodeDefinition,
  catalog: ProjectCatalog,
  parentFields: Record<string, FieldValue> = {},
): ElementBuildConfig {
  return resolveNodeToElementBuildConfig(
    definition.root,
    definition,
    catalog,
    parentFields,
    new Set([definition.uuid]),
    {},
    createTokenTextResolver(catalog.tokens ?? {}),
  );
}

function resolveNodeToElementBuildConfig(
  node: Node,
  definition: NodeDefinition,
  catalog: ProjectCatalog,
  parentFields: Record<string, FieldValue>,
  activeDefinitions: ReadonlySet<string>,
  inheritedOverrides: Record<string, FieldValue>,
  resolveTokenText: (value: string) => string,
): ElementBuildConfig {
  const definitionRef = node.config?.definitionRef;
  if (definitionRef) {
    const located = findDefinition(catalog, definitionRef);
    if (located) {
      const refDefinition = located.definition;
      if (activeDefinitions.has(refDefinition.uuid)) {
        throw new Error(`Cyclic catalog definition reference at "${refDefinition.uuid}"`);
      }
      const exposure = definition.config?.fieldExposure?.[node.uuid] ?? { mode: 'flat' as const };
      const instanceFieldConfigs = definition.config?.instanceFieldConfigs?.[node.uuid] ?? {};
      const parentComponentProps = componentPropValues(
        effectiveSchemaForDefinition(catalog, definition).schema,
        parentFields,
      );
      const instancePreviewData = resolveParentPropBindings(
        node.config?.previewData?.fields as Record<string, FieldValue> | undefined,
        parentComponentProps,
      );
      const instanceData = resolveParentPropBindings(
        node.data as Record<string, FieldValue> | undefined,
        parentComponentProps,
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
        ...effectiveSchemaForDefinition(catalog, refDefinition).previewDefaults,
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
        new Set(activeDefinitions).add(refDefinition.uuid),
        instanceOverrides,
        resolveTokenText,
      );
      const styleNodeUuids = new Set(built.styleNodeUuids ?? []);
      if (built.nodeUuid) styleNodeUuids.add(built.nodeUuid);
      styleNodeUuids.add(node.uuid);
      return { ...built, nodeUuid: node.uuid, styleNodeUuids: [...styleNodeUuids] };
    }
  }

  const definitionPreview = definition.config?.previewData?.fields ?? {};
  const fields = mergePreviewFields(
    { ...(definitionPreview as Record<string, FieldValue>), ...staticFieldValues(definition) },
    node.data as Record<string, FieldValue> | undefined,
    parentFields,
  );
  Object.assign(fields, lockedStaticFieldValues(definition));
  const nodeOverrides = {
    ...inheritedOverrides,
    ...(node.data as Record<string, FieldValue> | undefined),
  };
  for (const field of staticFieldsNotExposed(definition)) delete nodeOverrides[field];
  const ctx: PreviewResolveContext = {
    catalog,
    fields,
    componentProps: componentPropValues(
      effectiveSchemaForDefinition(catalog, definition).schema,
      fields,
    ),
    overrides: nodeOverrides,
  };

  const text = textFromNode(node, fields, ctx, resolveTokenText);
  const attributes = resolveStringRecord(node.dom.attributes, ctx) ?? {};
  const iconId = node.dom.tagName.toLowerCase() === 'svg' ? attributes['data-icon'] : undefined;
  const icon = iconId ? catalog.icons?.find((entry) => entry.id === iconId) : undefined;
  const children = (node.dom.children ?? []).map((child) =>
    resolveNodeToElementBuildConfig(
      child,
      definition,
      catalog,
      fields,
      activeDefinitions,
      fields,
      resolveTokenText,
    ),
  );
  const resolvedChildren =
    node.dom.tagName.toLowerCase() === 'svg' && icon
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
  const rule = catalog.globalStyles?.block?.rules?.find((entry) => entry.id === `layer-${node.uuid}`);
  const referencedStyles = Object.fromEntries(
    Object.entries(rule?.declarations ?? {}).filter(([, value]) => STYLE_REFERENCE.test(value)),
  );
  const dynamicStyle = resolveStringRecord(referencedStyles, ctx);
  const properties = node.dom.properties;

  return {
    tagName: node.dom.tagName,
    ...(text !== undefined ? { text } : {}),
    attributes,
    ...(node.dom.data ? { dataset: { ...node.dom.data } } : {}),
    ...(dynamicStyle && Object.keys(dynamicStyle).length ? { dynamicStyle } : {}),
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

function componentPropValues(
  schema: Record<string, unknown> | null,
  fields: Readonly<Record<string, FieldValue>>,
) {
  const values: Record<string, FieldValue> = {};
  for (const prop of componentPropsForSchema(schema)) {
    const path = prop.name.slice('props.'.length);
    let value: FieldValue | undefined = fields;
    for (const segment of path.split('.')) {
      value =
        value && typeof value === 'object' && !Array.isArray(value) ? value[segment] : undefined;
    }
    if (value !== undefined) values[prop.uuid] = value;
  }
  return values;
}

function resolveParentPropBindings(
  fields: Readonly<Record<string, FieldValue>> | undefined,
  parentProps: Readonly<Record<string, FieldValue>>,
) {
  if (!fields) return undefined;
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [
      name,
      resolveParentPropBinding(value, parentProps),
    ]),
  );
}

function resolveParentPropBinding(
  value: FieldValue,
  parentProps: Readonly<Record<string, FieldValue>>,
  activeProps = new Set<string>(),
): FieldValue {
  if (typeof value === 'string') {
    const match = value.match(COMPONENT_PROP_REF);
    const uuid = match?.[1];
    if (!uuid || activeProps.has(uuid)) return value;
    const parentValue = parentProps[uuid];
    if (parentValue === undefined) return value;
    const nextActive = new Set(activeProps).add(uuid);
    return resolveParentPropBinding(parentValue, parentProps, nextActive);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveParentPropBinding(entry, parentProps, activeProps));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, entry]) => [
        name,
        resolveParentPropBinding(entry, parentProps, activeProps),
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
