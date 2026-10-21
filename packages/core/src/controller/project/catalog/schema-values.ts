import type { FieldValue, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';
import { isFieldBindingValue, matchesPartialSchemaValue } from '../../validation/json-schema-value';
import { effectiveSchemaForDefinition, inheritableSchemaForDefinition } from './field-contract';
import { findDefinition, listCatalogDefinitions, resolveJsonSchemaForDefinition } from './ops';

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;

/** Reconcile values whose definition schemas changed, including values in nested instances. */
export function reconcileCatalogValuesForSchemaChange(
  previousCatalog: ProjectCatalog,
  nextCatalog: ProjectCatalog,
) {
  const changedDefinitions = listCatalogDefinitions(nextCatalog)
    .filter(({ definition }) => {
      const previous = findDefinition(previousCatalog, definition.uuid)?.definition;
      if (!previous) return false;
      const previousSchema = effectiveSchemaForDefinition(previousCatalog, previous).schema;
      const nextSchema = effectiveSchemaForDefinition(nextCatalog, definition).schema;
      return JSON.stringify(previousSchema) !== JSON.stringify(nextSchema);
    })
    .map(({ definition }) => definition.uuid);
  if (!changedDefinitions.length) return nextCatalog;
  const affected = affectedDefinitions(nextCatalog, changedDefinitions);
  const catalog = structuredClone(nextCatalog) as Mutable<ProjectCatalog>;

  for (const { kind, definition } of listCatalogDefinitions(nextCatalog)) {
    if (!affected.has(definition.uuid)) continue;
    reconcileDefinitionValues(catalog, catalog[kind][definition.uuid]!);
  }
  return catalog as ProjectCatalog;
}

function affectedDefinitions(catalog: ProjectCatalog, changedUuids: readonly string[]) {
  const affected = new Set(changedUuids);
  const definitions = listCatalogDefinitions(catalog).map(({ definition }) => definition);
  let changed = true;
  while (changed) {
    changed = false;
    for (const definition of definitions) {
      if (affected.has(definition.uuid)) continue;
      if (containsReferenceTo(definition.root, affected)) {
        affected.add(definition.uuid);
        changed = true;
      }
    }
  }
  return affected;
}

function containsReferenceTo(node: Node, definitionIds: ReadonlySet<string>): boolean {
  if (node.config?.definitionRef && definitionIds.has(node.config.definitionRef)) return true;
  return (node.dom.children ?? []).some((child) => containsReferenceTo(child, definitionIds));
}

function reconcileDefinitionValues(
  catalog: Mutable<ProjectCatalog>,
  definition: Mutable<NodeDefinition>,
) {
  const ownSchema = resolveJsonSchemaForDefinition(catalog, definition);
  const effectiveSchema = effectiveSchemaForDefinition(catalog, definition).schema;
  const config = definition.config;
  if (config?.staticFields && ownSchema) {
    for (const [field, fieldConfig] of Object.entries(config.staticFields)) {
      const schema = propertySchema(ownSchema, field);
      if (
        !schema ||
        fieldConfig.value === undefined ||
        matchesValue(fieldConfig.value, schema, catalog)
      )
        continue;
      const replacement = defaultForSchema(schema, catalog);
      if (replacement === undefined) delete config.staticFields[field];
      else config.staticFields[field] = { ...fieldConfig, value: replacement };
    }
    if (!Object.keys(config.staticFields).length) delete config.staticFields;
  }
  if (config?.previewData?.fields && effectiveSchema) {
    const fields = reconcileRecord(config.previewData.fields, effectiveSchema, catalog);
    if (Object.keys(fields).length) config.previewData.fields = fields;
    else delete config.previewData.fields;
    if (!config.previewData.fields && Object.keys(config.previewData).length === 0) {
      delete config.previewData;
    }
  }

  const visit = (node: Mutable<Node>) => {
    const target = node.config?.definitionRef
      ? findDefinition(catalog, node.config.definitionRef)?.definition
      : undefined;
    if (target) {
      const targetSchema = effectiveSchemaForDefinition(catalog, target).schema;
      if (targetSchema && node.data) {
        const data = reconcileRecord(node.data, targetSchema, catalog);
        if (Object.keys(data).length) node.data = data;
        else delete node.data;
      }
      if (targetSchema && node.config?.previewData?.fields) {
        const fields = reconcileRecord(node.config.previewData.fields, targetSchema, catalog);
        if (Object.keys(fields).length) node.config.previewData.fields = fields;
        else delete node.config.previewData.fields;
      }

      const instanceConfigs = config?.instanceFieldConfigs?.[node.uuid];
      const targetInheritableSchema = inheritableSchemaForDefinition(catalog, target);
      if (instanceConfigs && targetInheritableSchema) {
        for (const [field, fieldConfig] of Object.entries(instanceConfigs)) {
          const schema = propertySchema(targetInheritableSchema, field);
          if (
            !schema ||
            fieldConfig.value === undefined ||
            matchesValue(fieldConfig.value, schema, catalog)
          ) {
            continue;
          }
          const replacement = defaultForSchema(schema, catalog);
          if (replacement === undefined) delete instanceConfigs[field];
          else instanceConfigs[field] = { ...fieldConfig, value: replacement };
        }
        if (!Object.keys(instanceConfigs).length) delete config!.instanceFieldConfigs![node.uuid];
        if (!Object.keys(config!.instanceFieldConfigs!).length) delete config!.instanceFieldConfigs;
      }
      return;
    }
    for (const child of node.dom.children ?? []) visit(child);
  };
  visit(definition.root);
}

function reconcileRecord(
  values: Readonly<Record<string, FieldValue>>,
  schema: Record<string, unknown>,
  catalog: ProjectCatalog,
) {
  const result = { ...values };
  for (const [field, value] of Object.entries(result)) {
    const fieldSchema = propertySchema(schema, field);
    if (!fieldSchema || matchesValue(value, fieldSchema, catalog)) continue;
    const replacement = defaultForSchema(fieldSchema, catalog);
    if (replacement === undefined) delete result[field];
    else result[field] = replacement;
  }
  return result;
}

function propertySchema(schema: Record<string, unknown>, path: string) {
  let current: unknown = schema;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    const properties = (current as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return null;
    current = (properties as Record<string, unknown>)[segment];
  }
  return current && typeof current === 'object' && !Array.isArray(current)
    ? (current as Record<string, unknown>)
    : null;
}

function matchesValue(value: unknown, schema: Record<string, unknown>, catalog: ProjectCatalog) {
  if (isFieldBindingValue(value, schema)) return true;
  const resolved = resolveCatalogSchemaReferences(schema, catalog);
  if (hasUnresolvedCatalogReference(resolved)) return true;
  return (
    matchesPartialSchemaValue(
      value,
      resolved as Parameters<typeof matchesPartialSchemaValue>[1],
      catalog.schemas,
    ) && matchesCatalogReferences(value, resolved, catalog)
  );
}

function matchesCatalogReferences(
  value: unknown,
  schema: Record<string, unknown>,
  catalog: ProjectCatalog,
): boolean {
  const reference = schema['x-facadeur-reference'];
  if (reference && typeof reference === 'object' && 'target' in reference && value !== undefined) {
    const target = (reference as Record<string, unknown>).target;
    const validBinding =
      typeof value === 'string' &&
      (target === 'icon'
        ? /^\{(?:prop|props):[^}]+\}$/.test(value)
        : target === 'component' && /^\{(?:prop|props|item):[^}]+\}$/.test(value));
    if (!validBinding) {
      if (typeof value !== 'string') return false;
      if (target === 'icon' && !catalog.icons?.some((icon) => icon.id === value)) return false;
      if (target === 'component' && !Object.hasOwn(catalog.components, value)) return false;
    }
  }

  const properties = schema.properties;
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    properties &&
    typeof properties === 'object'
  ) {
    for (const [name, childSchema] of Object.entries(properties)) {
      if (!childSchema || typeof childSchema !== 'object' || Array.isArray(childSchema)) continue;
      if (
        !matchesCatalogReferences(
          (value as Record<string, unknown>)[name],
          childSchema as Record<string, unknown>,
          catalog,
        )
      ) {
        return false;
      }
    }
  }
  if (Array.isArray(value) && schema.items && typeof schema.items === 'object') {
    return value.every((entry) =>
      matchesCatalogReferences(entry, schema.items as Record<string, unknown>, catalog),
    );
  }
  return true;
}

function defaultForSchema(
  input: Record<string, unknown>,
  catalog: ProjectCatalog,
  active = new Set<string>(),
): FieldValue | undefined {
  const ref = input.$ref;
  const refMatch = typeof ref === 'string' ? /^urn:facadeur:schema:([^#]+)$/.exec(ref) : null;
  const referencedId = refMatch?.[1];
  let nextActive = active;
  if (referencedId && catalog.schemas?.[referencedId]) {
    if (active.has(referencedId)) return undefined;
    nextActive = new Set(active).add(referencedId);
  }
  const schema = resolveCatalogSchemaReferences(input, catalog, active);
  const explicitDefault = asFieldValue(schema.default);
  if (explicitDefault !== undefined && matchesValue(explicitDefault, schema, catalog))
    return explicitDefault;
  const constant = asFieldValue(schema.const);
  if (constant !== undefined && matchesValue(constant, schema, catalog)) return constant;
  if (Array.isArray(schema.enum) && schema.enum.length) {
    const firstEnumValue = asFieldValue(schema.enum[0]);
    if (firstEnumValue !== undefined && matchesValue(firstEnumValue, schema, catalog))
      return firstEnumValue;
  }

  const reference = schema['x-facadeur-reference'];
  if (reference && typeof reference === 'object' && 'target' in reference) {
    const target = (reference as Record<string, unknown>).target;
    if (target === 'icon') return catalog.icons?.[0]?.id;
    if (target === 'component') return Object.keys(catalog.components)[0];
  }

  if (schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
    const values: Record<string, unknown> = {};
    for (const [name, childSchema] of Object.entries(schema.properties)) {
      if (!childSchema || typeof childSchema !== 'object' || Array.isArray(childSchema)) continue;
      const value = defaultForSchema(childSchema as Record<string, unknown>, catalog, nextActive);
      if (value !== undefined) values[name] = value;
    }
    return Object.keys(values).length ? asFieldValue(values) : undefined;
  }
  if (schema.type === 'array') return [];
  return undefined;
}

function asFieldValue(value: unknown): FieldValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (Array.isArray(value)) {
    const items = value.map(asFieldValue);
    return items.every((item) => item !== undefined) ? (items as FieldValue[]) : undefined;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, entry]) => [key, asFieldValue(entry)] as const,
    );
    return entries.every(([, entry]) => entry !== undefined)
      ? (Object.fromEntries(entries) as FieldValue)
      : undefined;
  }
  return undefined;
}

export function resolveCatalogSchemaReferences(
  input: Record<string, unknown>,
  catalog: ProjectCatalog,
  active = new Set<string>(),
): Record<string, unknown> {
  const ref = input.$ref;
  if (typeof ref === 'string') {
    const match = /^urn:facadeur:schema:([^#]+)$/.exec(ref);
    const id = match?.[1];
    const referenced = id ? catalog.schemas?.[id] : undefined;
    if (referenced && !active.has(id!)) {
      const nextActive = new Set(active).add(id!);
      const { $ref: _ref, ...siblings } = input;
      return resolveCatalogSchemaReferences({ ...referenced, ...siblings }, catalog, nextActive);
    }
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value.map((entry) =>
            entry && typeof entry === 'object' && !Array.isArray(entry)
              ? resolveCatalogSchemaReferences(entry as Record<string, unknown>, catalog, active)
              : entry,
          )
        : value && typeof value === 'object'
          ? resolveCatalogSchemaReferences(value as Record<string, unknown>, catalog, active)
          : value,
    ]),
  );
}

function hasUnresolvedCatalogReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasUnresolvedCatalogReference);
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.$ref === 'string' && record.$ref.startsWith('urn:facadeur:schema:'))
    return true;
  return Object.values(record).some(hasUnresolvedCatalogReference);
}
