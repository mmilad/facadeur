import type {
  FieldExposure,
  FieldValue,
  JsonSchemaObject,
  Node,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import { findDefinition, resolveJsonSchemaForDefinition } from './ops';

export type EffectiveFieldOrigin =
  | { readonly kind: 'local' }
  | {
      readonly kind: 'inherited';
      readonly instanceUuid: string;
      readonly instanceName: string;
      readonly definitionName: string;
      readonly fieldName: string;
    };

export type EffectiveDefinitionSchema = {
  readonly schema: JsonSchemaObject | null;
  readonly origins: ReadonlyMap<string, EffectiveFieldOrigin>;
  readonly previewDefaults: Readonly<Record<string, FieldValue>>;
};

type ObjectSchema = JsonSchemaObject & {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
};

/** Resolve a definition schema with fields exposed from nested catalog instances. */
export function effectiveSchemaForDefinition(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
): EffectiveDefinitionSchema {
  return resolveEffectiveSchema(catalog, definition, new Set());
}

function resolveEffectiveSchema(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
  ancestors: ReadonlySet<string>,
): EffectiveDefinitionSchema {
  const ownSchema = resolveJsonSchemaForDefinition(catalog, definition);
  const schema: ObjectSchema = ownSchema
    ? (structuredClone(ownSchema) as ObjectSchema)
    : { type: 'object' };
  const properties = { ...(schema.properties ?? {}) };
  const required = new Set(schema.required ?? []);
  const origins = new Map<string, EffectiveFieldOrigin>();
  const previewDefaults: Record<string, FieldValue> = {};
  for (const name of Object.keys(properties)) origins.set(name, { kind: 'local' });
  if (ancestors.has(definition.uuid)) {
    return {
      schema,
      origins,
      previewDefaults: { ...(definition.config?.previewData?.fields ?? {}) },
    };
  }

  const nextAncestors = new Set(ancestors).add(definition.uuid);
  const visit = (node: Node) => {
    const ref = node.config?.definitionRef;
    if (ref) {
      const target = findDefinition(catalog, ref)?.definition;
      if (target) {
        const child = resolveEffectiveSchema(catalog, target, nextAncestors);
        const childSchema = child.schema as ObjectSchema | null;
        const childProperties = childSchema?.properties ?? {};
        const exposure: FieldExposure = node.config?.fieldExposure ??
          target.config?.fieldExposure ?? { mode: 'flat' };
        if (exposure.mode === 'flat') {
          for (const name of Object.keys(childProperties)) {
            properties[name] = childProperties[name];
            origins.set(name, {
              kind: 'inherited',
              instanceUuid: node.uuid,
              instanceName: node.name || target.name,
              definitionName: target.name,
              fieldName: name,
            });
            if (childSchema?.required?.includes(name)) required.add(name);
            else required.delete(name);
            const defaultValue = child.previewDefaults[name];
            if (defaultValue !== undefined) previewDefaults[name] = defaultValue;
          }
        } else if (exposure.mode === 'grouped') {
          const groupName = exposure.groupName || node.name || target.name;
          properties[groupName] = {
            type: 'object',
            title: groupName,
            properties: childProperties,
            ...(childSchema?.required?.length ? { required: childSchema.required } : {}),
            additionalProperties: false,
          };
          origins.set(groupName, {
            kind: 'inherited',
            instanceUuid: node.uuid,
            instanceName: node.name || target.name,
            definitionName: target.name,
            fieldName: '*',
          });
          if (childSchema?.required?.length) required.add(groupName);
          else required.delete(groupName);
          if (Object.keys(child.previewDefaults).length) {
            previewDefaults[groupName] = child.previewDefaults;
          }
        } else {
          for (const [sourcePath, aliasValue] of Object.entries(exposure.fields)) {
            const alias = aliasValue.trim();
            const fieldSchema = schemaAtPath(childSchema, sourcePath);
            if (!alias || !fieldSchema) continue;
            properties[alias] = fieldSchema;
            origins.set(alias, {
              kind: 'inherited',
              instanceUuid: node.uuid,
              instanceName: node.name || target.name,
              definitionName: target.name,
              fieldName: sourcePath,
            });
            if (isRequiredAtPath(childSchema, sourcePath)) required.add(alias);
            else required.delete(alias);
            const defaultValue = valueAtPath(child.previewDefaults, sourcePath);
            if (defaultValue !== undefined) previewDefaults[alias] = defaultValue;
          }
        }
      }
      return;
    }
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(definition.root);

  Object.assign(previewDefaults, definition.config?.previewData?.fields ?? {});

  schema.type = schema.type ?? 'object';
  schema.properties = properties;
  if (required.size) schema.required = [...required];
  else delete schema.required;
  return { schema, origins, previewDefaults };
}

function schemaAtPath(schema: ObjectSchema | null, path: string) {
  let current: unknown = schema;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;
    const properties = (current as ObjectSchema).properties;
    if (!properties || !(segment in properties)) return undefined;
    current = properties[segment];
  }
  return current;
}

function isRequiredAtPath(schema: ObjectSchema | null, path: string) {
  let current: ObjectSchema | null = schema;
  const segments = path.split('.');
  for (const [index, segment] of segments.entries()) {
    if (!current?.required?.includes(segment)) return false;
    if (index < segments.length - 1) {
      const nested = schemaAtPath(current, segment);
      current = nested && typeof nested === 'object' ? (nested as ObjectSchema) : null;
    }
  }
  return true;
}

function valueAtPath(value: Readonly<Record<string, FieldValue>>, path: string) {
  let current: FieldValue | undefined;
  let record: Readonly<Record<string, FieldValue>> = value;
  const segments = path.split('.');
  for (const [index, segment] of segments.entries()) {
    current = record[segment];
    if (index < segments.length - 1) {
      if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
      record = current;
    }
  }
  return current;
}
