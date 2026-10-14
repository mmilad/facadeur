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

/** Resolve only the fields this definition makes available to its parent. */
export function inheritableSchemaForDefinition(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
) {
  const effective = effectiveSchemaForDefinition(catalog, definition);
  return filterUnexposedStaticFields(definition, effective.schema as ObjectSchema | null);
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
  schema.properties = properties;
  const required = new Set(schema.required ?? []);
  const origins = new Map<string, EffectiveFieldOrigin>();
  const previewDefaults: Record<string, FieldValue> = {};
  for (const [name, field] of Object.entries(definition.config?.staticFields ?? {})) {
    const property = properties[name];
    if (field.isStatic && field.value !== undefined && property && typeof property === 'object') {
      properties[name] = { ...(property as Record<string, unknown>), default: field.value };
    }
  }
  for (const name of Object.keys(properties)) origins.set(name, { kind: 'local' });
  if (ancestors.has(definition.uuid)) {
    return {
      schema,
      origins,
      previewDefaults: {
        ...Object.fromEntries(
          Object.entries(definition.config?.previewData?.fields ?? {}).filter(
            ([name]) => !definition.config?.staticFields?.[name]?.isStatic,
          ),
        ),
        ...staticFieldValues(definition),
      },
    };
  }

  const nextAncestors = new Set(ancestors).add(definition.uuid);
  const visit = (node: Node) => {
    const ref = node.config?.definitionRef;
    if (ref) {
      const target = findDefinition(catalog, ref)?.definition;
      if (target) {
        const child = resolveEffectiveSchema(catalog, target, nextAncestors);
        const definitionChildSchema = filterUnexposedStaticFields(
          target,
          child.schema as ObjectSchema | null,
        );
        const instanceFieldConfigs = definition.config?.instanceFieldConfigs?.[node.uuid] ?? {};
        const childSchema = applyInstanceFieldConfigs(definitionChildSchema, instanceFieldConfigs);
        const inheritableSchema = childSchema;
        const childProperties = childSchema?.properties ?? {};
        const childRequired = childSchema?.required ?? [];
        const childPreviewDefaults = {
          ...child.previewDefaults,
          ...Object.fromEntries(
            Object.entries(instanceFieldConfigs)
              .filter(
                ([, config]) =>
                  config.isStatic && config.expose === true && config.value !== undefined,
              )
              .map(([name, config]) => [name, config.value!]),
          ),
        };
        const exposure: FieldExposure = definition.config?.fieldExposure?.[node.uuid] ?? {
          mode: 'flat',
        };
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
            if (childRequired.includes(name)) required.add(name);
            else required.delete(name);
            const defaultValue = childPreviewDefaults[name];
            if (defaultValue !== undefined) previewDefaults[name] = defaultValue;
          }
        } else if (exposure.mode === 'grouped') {
          const groupName = exposure.groupName || node.name || target.name;
          if (Object.keys(childProperties).length) {
            properties[groupName] = {
              type: 'object',
              title: groupName,
              properties: childProperties,
              ...(childRequired.length ? { required: childRequired } : {}),
              additionalProperties: false,
            };
            origins.set(groupName, {
              kind: 'inherited',
              instanceUuid: node.uuid,
              instanceName: node.name || target.name,
              definitionName: target.name,
              fieldName: '*',
            });
            if (childRequired.length) required.add(groupName);
            else required.delete(groupName);
            const defaults = Object.fromEntries(
              Object.entries(childPreviewDefaults).filter(([name]) =>
                Object.prototype.hasOwnProperty.call(childProperties, name),
              ),
            );
            if (Object.keys(defaults).length) previewDefaults[groupName] = defaults;
          }
        } else {
          for (const [sourcePath, aliasValue] of Object.entries(exposure.fields)) {
            const alias = aliasValue.trim();
            const fieldSchema = schemaAtPath(inheritableSchema, sourcePath);
            if (!alias || !fieldSchema) continue;
            properties[alias] = fieldSchema;
            origins.set(alias, {
              kind: 'inherited',
              instanceUuid: node.uuid,
              instanceName: node.name || target.name,
              definitionName: target.name,
              fieldName: sourcePath,
            });
            if (isRequiredAtPath(inheritableSchema, sourcePath)) required.add(alias);
            else required.delete(alias);
            const defaultValue = valueAtPath(childPreviewDefaults, sourcePath);
            if (defaultValue !== undefined) previewDefaults[alias] = defaultValue;
          }
        }
      }
      return;
    }
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(definition.root);

  for (const [name, value] of Object.entries(definition.config?.previewData?.fields ?? {})) {
    if (!definition.config?.staticFields?.[name]?.isStatic) previewDefaults[name] = value;
  }
  Object.assign(previewDefaults, staticFieldValues(definition));

  schema.type = schema.type ?? 'object';
  schema.properties = properties;
  if (required.size) schema.required = [...required];
  else delete schema.required;
  return { schema, origins, previewDefaults };
}

function staticFieldValues(definition: NodeDefinition): Record<string, FieldValue> {
  return Object.fromEntries(
    Object.entries(definition.config?.staticFields ?? {}).flatMap(([name, field]) =>
      field.isStatic && field.value !== undefined ? [[name, field.value]] : [],
    ),
  );
}

function filterUnexposedStaticFields(
  definition: NodeDefinition,
  schema: ObjectSchema | null,
): ObjectSchema | null {
  if (!schema) return null;
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).filter(([name]) => {
      const field = definition.config?.staticFields?.[name];
      return !field?.isStatic || field.expose === true;
    }),
  );
  const required = (schema.required ?? []).filter((name) =>
    Object.prototype.hasOwnProperty.call(properties, name),
  );
  const filtered = { ...schema, properties };
  if (required.length) filtered.required = required;
  else delete filtered.required;
  return filtered;
}

function applyInstanceFieldConfigs(
  schema: ObjectSchema | null,
  configs: Readonly<Record<string, import('@facadeur/domain').StaticFieldConfig>>,
) {
  if (!schema) return null;
  const properties = { ...(schema.properties ?? {}) };
  for (const [name, config] of Object.entries(configs)) {
    if (!config.isStatic || config.expose !== true || config.value === undefined) continue;
    const property = properties[name];
    if (property && typeof property === 'object') {
      properties[name] = { ...(property as Record<string, unknown>), default: config.value };
    }
  }
  const hidden = new Set(
    Object.entries(configs)
      .filter(([, config]) => config.isStatic && config.expose !== true)
      .map(([name]) => name),
  );
  const exposedProperties = Object.fromEntries(
    Object.entries(properties).filter(([name]) => !hidden.has(name)),
  );
  const required = (schema.required ?? []).filter((name) => !hidden.has(name));
  const result = { ...schema, properties: exposedProperties };
  if (required.length) result.required = required;
  else delete result.required;
  return result;
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
