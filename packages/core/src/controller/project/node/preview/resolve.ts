import type { FieldValue, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import type { ElementBuildConfig } from '@facadeur/domain';
import { findDefinition } from '../../catalog/ops';
import { mergePreviewFields } from './merge';

/** Merged field layers + catalog context for binding resolution. */
export type PreviewResolveContext = {
  readonly catalog: ProjectCatalog;
  readonly fields: Record<string, FieldValue>;
};

const PROP_REF = /^\{prop:([^}]+)\}$/;

/** Replace `{prop:uuid}` and similar templates with literal strings for renderers. */
export function resolveTemplateString(template: string, ctx: PreviewResolveContext): string {
  const match = template.match(PROP_REF);
  if (match) {
    const uuid = match[1];
    const prop = uuid ? ctx.catalog.props?.[uuid] : undefined;
    if (prop?.value) return prop.value;
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
    const fieldOverride = ctx.fields[key];
    if (fieldOverride !== undefined && fieldOverride !== null && fieldOverride !== '') {
      out[key] =
        typeof fieldOverride === 'string'
          ? fieldOverride
          : typeof fieldOverride === 'number' || typeof fieldOverride === 'boolean'
            ? String(fieldOverride)
            : resolveTemplateString(value, ctx);
    } else {
      out[key] = resolveTemplateString(value, ctx);
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

function textFromNode(node: Node, fields: Record<string, FieldValue>): string | undefined {
  const fromProperty = node.dom.properties?.textContent;
  if (typeof fromProperty === 'string') return fromProperty;
  return stringField(fields.text);
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
  return resolveNodeToElementBuildConfig(definition.root, definition, catalog, parentFields);
}

function resolveNodeToElementBuildConfig(
  node: Node,
  definition: NodeDefinition,
  catalog: ProjectCatalog,
  parentFields: Record<string, FieldValue>,
): ElementBuildConfig {
  const definitionRef = node.config?.definitionRef;
  if (definitionRef) {
    const located = findDefinition(catalog, definitionRef);
    if (located) {
      const refDefinition = located.definition;
      const instanceFields = {
        ...parentFields,
        ...(node.data as Record<string, FieldValue> | undefined),
      };
      const built = resolveNodeToElementBuildConfig(
        refDefinition.root,
        refDefinition,
        catalog,
        instanceFields,
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
  const ctx: PreviewResolveContext = { catalog, fields };

  const children = (node.dom.children ?? []).map((child) =>
    resolveNodeToElementBuildConfig(child, definition, catalog, fields),
  );

  const text = textFromNode(node, fields);
  const attributes = resolveStringRecord(node.dom.attributes, ctx) ?? {};
  const style = resolveStringRecord(node.style, ctx);

  return {
    tagName: node.dom.tagName,
    ...(text ? { text } : {}),
    attributes,
    ...(node.dom.data ? { dataset: { ...node.dom.data } } : {}),
    ...(style && Object.keys(style).length ? { style } : {}),
    ...(node.dom.properties ? { properties: { ...node.dom.properties } } : {}),
    ...(children.length ? { children } : {}),
    nodeUuid: node.uuid,
  };
}
