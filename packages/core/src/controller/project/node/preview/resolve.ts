import type { FieldValue, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import type { ElementBuildConfig } from '@facadeur/domain';
import { findDefinition } from '../../catalog/ops';
import { mergePreviewFields } from './merge';
import { effectiveSchemaForDefinition } from '../../catalog/field-contract';
import { componentPropsForSchema } from '../../catalog/field-ids';

/** Merged field layers + catalog context for binding resolution. */
export type PreviewResolveContext = {
  readonly catalog: ProjectCatalog;
  readonly fields: Record<string, FieldValue>;
  readonly overrides?: Record<string, FieldValue>;
  readonly componentProps?: Readonly<Record<string, FieldValue>>;
};

const PROP_REF = /^\{prop:([^}]+)\}$/;
const COMPONENT_PROP_REF = /^\{props:([^}]+)\}$/;

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
): string | undefined {
  const fieldText = stringField(fields.text);
  const source =
    fieldText ??
    node.dom.text ??
    (typeof node.dom.properties?.textContent === 'string'
      ? node.dom.properties.textContent
      : undefined);
  return source === undefined ? undefined : resolveTemplateString(source, ctx);
}

/**
 * Walk a definition tree: merge field layers, resolve bindings, emit renderer-ready configs.
 * Repeaters / definitionRef expansion belong here later — not in buildElement.
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
  );
}

function resolveNodeToElementBuildConfig(
  node: Node,
  definition: NodeDefinition,
  catalog: ProjectCatalog,
  parentFields: Record<string, FieldValue>,
  activeDefinitions: ReadonlySet<string>,
  inheritedOverrides: Record<string, FieldValue>,
): ElementBuildConfig {
  const definitionRef = node.config?.definitionRef;
  if (definitionRef) {
    const located = findDefinition(catalog, definitionRef);
    if (located) {
      const refDefinition = located.definition;
      if (activeDefinitions.has(refDefinition.uuid)) {
        throw new Error(`Cyclic catalog definition reference at "${refDefinition.uuid}"`);
      }
      const exposure = node.config?.fieldExposure ??
        refDefinition.config?.fieldExposure ?? { mode: 'flat' as const };
      const exposureValues =
        exposure.mode === 'grouped'
          ? objectField(parentFields[exposure.groupName || node.name || refDefinition.name])
          : exposure.mode === 'manual'
            ? valuesMappedToChildFields(parentFields, exposure.fields)
            : {};
      const instanceFields = {
        ...(refDefinition.config?.previewData?.fields as Record<string, FieldValue> | undefined),
        ...parentFields,
        ...exposureValues,
        ...(node.config?.previewData?.fields as Record<string, FieldValue> | undefined),
        ...(node.data as Record<string, FieldValue> | undefined),
      };
      const instanceOverrides = {
        ...parentFields,
        ...exposureValues,
        ...(node.config?.previewData?.fields as Record<string, FieldValue> | undefined),
        ...(node.data as Record<string, FieldValue> | undefined),
      };
      const built = resolveNodeToElementBuildConfig(
        refDefinition.root,
        refDefinition,
        catalog,
        instanceFields,
        new Set(activeDefinitions).add(refDefinition.uuid),
        instanceOverrides,
      );
      return { ...built, nodeUuid: node.uuid };
    }
  }

  const definitionPreview = definition.config?.previewData?.fields ?? {};
  const fields = mergePreviewFields(
    definitionPreview as Record<string, FieldValue>,
    node.data as Record<string, FieldValue> | undefined,
    parentFields,
  );
  const ctx: PreviewResolveContext = {
    catalog,
    fields,
    componentProps: componentPropValues(
      effectiveSchemaForDefinition(catalog, definition).schema,
      fields,
    ),
    overrides: {
      ...inheritedOverrides,
      ...(node.data as Record<string, FieldValue> | undefined),
    },
  };

  const children = (node.dom.children ?? []).map((child) =>
    resolveNodeToElementBuildConfig(child, definition, catalog, fields, activeDefinitions, fields),
  );

  const text = textFromNode(node, fields, ctx);
  const attributes = resolveStringRecord(node.dom.attributes, ctx) ?? {};
  const style = resolveStringRecord(node.style, ctx);
  const properties = node.dom.properties
    ? Object.fromEntries(
        Object.entries(node.dom.properties).filter(([name]) => name !== 'textContent'),
      )
    : undefined;

  return {
    tagName: node.dom.tagName,
    ...(text !== undefined ? { text } : {}),
    attributes,
    ...(node.dom.data ? { dataset: { ...node.dom.data } } : {}),
    ...(style && Object.keys(style).length ? { style } : {}),
    ...(properties && Object.keys(properties).length ? { properties } : {}),
    ...(children.length ? { children } : {}),
    nodeUuid: node.uuid,
  };
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
