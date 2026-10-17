import { Value } from '@sinclair/typebox/value';
import { DocumentError } from '../../../document/errors';
import { projectCatalogSchema } from '../../../schema/node-model/index';
import type { Node, ProjectCatalog } from '@facadeur/domain';
import { sanitizeProjectCatalog } from './sanitize-field-values';
import { assertComponentBehaviorIntegrity } from './validate-behavior';
import { schemaPathExists } from './schema-path';
import { ensureGeneratedNodeClasses } from './node-classes';
import { findDefinition, listCatalogDefinitions, resolveJsonSchemaForDefinition } from './ops';
import { effectiveSchemaForDefinition, inheritableSchemaForDefinition } from './field-contract';
import { isFieldBindingValue, matchesPartialSchemaValue } from '../../validation/json-schema-value';
import { componentPropsForSchema, ensureCatalogFieldIds } from './field-ids';
import { canAcceptCatalogChildren, defaultChildrenSlotCount } from './tree-ops';
import { isVoidHtmlTag } from '../../../document/html-tags';
import { migrateFontSources } from './migrate-font-sources';

function catalogSchemaErrorMessage(data: unknown): string {
  try {
    return (
      [...Value.Errors(projectCatalogSchema, data)]
        .map((error) => `${error.path} ${error.message}`.trim())
        .join('; ') || 'Catalog does not match the schema'
    );
  } catch {
    return 'Catalog does not match the schema';
  }
}

export function validateProjectCatalog(data: unknown): ProjectCatalog {
  const migrated = migrateFontSources(data);
  const normalized =
    migrated && typeof migrated === 'object'
      ? ensureGeneratedNodeClasses(migrated as ProjectCatalog)
      : migrated;
  const sanitized =
    normalized && typeof normalized === 'object'
      ? sanitizeProjectCatalog(normalized as ProjectCatalog)
      : normalized;
  const catalog =
    sanitized && typeof sanitized === 'object'
      ? ensureCatalogFieldIds(sanitized as ProjectCatalog).catalog
      : sanitized;

  try {
    if (!Value.Check(projectCatalogSchema, catalog)) {
      throw new DocumentError('schema', catalogSchemaErrorMessage(catalog));
    }
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError('schema', catalogSchemaErrorMessage(catalog));
  }

  assertCatalogRefIntegrity(catalog as ProjectCatalog);
  assertNodeTagIntegrity(catalog as ProjectCatalog);
  assertComponentBehaviorIntegrity(catalog as ProjectCatalog);
  assertChildrenSlotIntegrity(catalog as ProjectCatalog);
  assertEffectiveCatalogFields(catalog as ProjectCatalog);
  return catalog as ProjectCatalog;
}

function assertNodeTagIntegrity(catalog: ProjectCatalog) {
  for (const { definition } of listCatalogDefinitions(catalog)) {
    const visit = (node: Node) => {
      if (node.config?.composition?.kind !== 'repeater' && !node.dom.tagName) {
        throw new DocumentError(
          'schema',
          `DOM node "${node.name ?? node.uuid}" must define a tag name.`,
        );
      }
      for (const child of node.dom.children ?? []) visit(child);
    };
    visit(definition.root);
  }
}

function assertChildrenSlotIntegrity(catalog: ProjectCatalog) {
  const definitions = listCatalogDefinitions(catalog).map(({ definition }) => definition);
  for (const definition of definitions) {
    const slotCount = defaultChildrenSlotCount(definition);
    if (slotCount && definition.kind !== 'component') {
      throw new DocumentError(
        'schema',
        `Children slot is only supported in component definitions ("${definition.name}").`,
      );
    }
    if (slotCount > 1) {
      throw new DocumentError(
        'schema',
        `Component "${definition.name}" has ${slotCount} Children slots; only one default slot is supported.`,
      );
    }
    const visit = (node: Node) => {
      const children = node.dom.children ?? [];
      if (node.config?.composition?.kind === 'slot') {
        if (node.dom.tagName && isVoidHtmlTag(node.dom.tagName)) {
          throw new DocumentError(
            'schema',
            `Children slot "${node.name ?? node.uuid}" cannot use void HTML tag "${node.dom.tagName}".`,
          );
        }
        if (children.length) {
          throw new DocumentError(
            'schema',
            `Children slot "${node.name ?? node.uuid}" cannot contain authored child layers.`,
          );
        }
      }
      if (
        children.length &&
        (node.config?.definitionRef || node.config?.definitionRefBinding) &&
        !canAcceptCatalogChildren(node, catalog)
      ) {
        throw new DocumentError(
          'schema',
          `Component instance "${node.name ?? node.uuid}" has child layers, but its target does not provide a Children slot.`,
        );
      }
      for (const child of children) visit(child);
    };
    visit(definition.root);
  }
}

function assertEffectiveCatalogFields(catalog: ProjectCatalog) {
  const definitions = listCatalogDefinitions(catalog).map(({ definition }) => definition);
  const validateRecord = (
    values: Readonly<Record<string, unknown>> | undefined,
    schema: Record<string, unknown> | null,
    context: string,
  ) => {
    if (!values || !schema) return;
    const properties =
      schema.properties && typeof schema.properties === 'object'
        ? (schema.properties as Record<string, unknown>)
        : {};
    for (const [field, value] of Object.entries(values)) {
      const fieldSchema = properties[field];
      if (!fieldSchema) continue;
      const matchesSchema = matchesPartialSchemaValue(
        value,
        fieldSchema as Parameters<typeof matchesPartialSchemaValue>[1],
      );
      const isBinding = isFieldBindingValue(value, fieldSchema);
      if (!matchesSchema && !isBinding) {
        if (context.startsWith('preview defaults') || context.startsWith('instance preview values'))
          continue;
        throw new DocumentError(
          'schema',
          `Invalid value for field "${field}" in ${context}; it does not match the current schema.`,
        );
      }
      if (matchesSchema || isBinding)
        assertCatalogReferenceValue(value, fieldSchema, catalog, `${context}.${field}`);
    }
  };

  for (const definition of definitions) {
    const effective = effectiveSchemaForDefinition(catalog, definition);
    const ownSchema = resolveJsonSchemaForDefinition(catalog, definition);
    const visitComposition = (
      node: Node,
      parent: Node | undefined,
      itemSchema: Record<string, unknown> | null,
    ) => {
      const composition = node.config?.composition;
      const source = composition && composition.kind !== 'slot' ? composition.source : undefined;
      let sourceSchema: Record<string, unknown> | null = null;
      if (composition && source?.kind === 'prop') {
        const prop = componentPropsForSchema(effective.schema).find(
          (entry) => entry.uuid === source.uuid,
        );
        sourceSchema = prop ? schemaAtPath(effective.schema, prop.path) : null;
      } else if (composition && source?.kind === 'item') {
        sourceSchema = itemSchema ? schemaAtPath(itemSchema, source.path) : null;
      } else if (composition && source?.kind === 'state') {
        sourceSchema =
          (definition.behavior?.stateSchema?.[source.name] as
            Record<string, unknown> | undefined) ?? null;
      }
      if (composition && source) {
        const validSource =
          composition.kind === 'repeater'
            ? sourceSchema?.type === 'array'
            : isEnumSchema(sourceSchema);
        if (!validSource) {
          throw new DocumentError(
            'schema',
            `Invalid ${composition.kind} source on node "${node.name ?? node.uuid}"`,
          );
        }
      }
      if (composition?.kind === 'repeater' && composition.filter) {
        const filter = composition.filter;
        const itemSchema = asSchemaRecord(sourceSchema?.items);
        const itemFieldSchema = itemSchema ? schemaAtPath(itemSchema, filter.itemPath) : null;
        const querySchema = definition.behavior?.stateSchema?.[filter.queryState];
        if (
          querySchema?.type !== 'string' ||
          typeof definition.behavior?.state?.[filter.queryState] !== 'string' ||
          itemFieldSchema?.type !== 'string'
        ) {
          throw new DocumentError(
            'schema',
            `Repeater filter on node "${node.name ?? node.uuid}" must use a string item field and a string behavior state (${definition.name}).`,
          );
        }
      }
      if (composition?.kind === 'repeater' && composition.keyPath) {
        const keySchema = schemaAtPath(asSchemaRecord(sourceSchema?.items), composition.keyPath);
        if (source?.kind === 'state' || keySchema?.type !== 'string') {
          throw new DocumentError(
            'schema',
            `Repeater key field on node "${node.name ?? node.uuid}" must be a string field from a prop or item array (${definition.name}).`,
          );
        }
      }
      if (source?.kind === 'item' && !itemSchema) {
        throw new DocumentError(
          'schema',
          `Item binding requires a repeater context (${node.uuid})`,
        );
      }
      if (node.config?.definitionRefBinding && node.config.definitionRef) {
        throw new DocumentError(
          'schema',
          `A node cannot have both a fixed and dynamic component reference (${node.uuid})`,
        );
      }
      if (node.config?.definitionRefBinding) {
        const referenceSchema = itemSchema
          ? schemaAtPath(itemSchema, node.config.definitionRefBinding.path)
          : null;
        const reference = referenceSchema?.['x-facadeur-reference'];
        if (
          !reference ||
          typeof reference !== 'object' ||
          !('target' in reference) ||
          reference.target !== 'component'
        ) {
          throw new DocumentError(
            'schema',
            `Dynamic component reference requires a component reference field (${node.uuid})`,
          );
        }
      }
      if (node.config?.compositionCase && parent?.config?.composition?.kind !== 'switch') {
        throw new DocumentError('schema', `Switch case requires a switch parent (${node.uuid})`);
      }
      const parentComposition = parent?.config?.composition;
      if (
        node.config?.compositionCase &&
        parentComposition?.kind === 'switch' &&
        parentComposition.source
      ) {
        const parentSource = parentComposition.source;
        const parentSourceSchema =
          parentSource.kind === 'item'
            ? itemSchema
              ? schemaAtPath(itemSchema, parentSource.path)
              : null
            : parentSource.kind === 'state'
              ? null
              : (() => {
                  const parentProp = componentPropsForSchema(effective.schema).find(
                    (entry) => entry.uuid === parentSource.uuid,
                  );
                  return parentProp ? schemaAtPath(effective.schema, parentProp.path) : null;
                })();
        if (!enumValues(parentSourceSchema).includes(node.config.compositionCase)) {
          throw new DocumentError(
            'schema',
            `Unknown switch case "${node.config.compositionCase}" (${node.uuid})`,
          );
        }
      }
      const childItemSchema =
        composition?.kind === 'repeater' && sourceSchema
          ? asSchemaRecord(sourceSchema.items)
          : itemSchema;
      for (const child of node.dom.children ?? []) {
        visitComposition(child, node, childItemSchema);
      }
    };
    visitComposition(definition.root, undefined, null);
    for (const [field, config] of Object.entries(definition.config?.staticFields ?? {})) {
      if (!config.isStatic) {
        throw new DocumentError(
          'schema',
          `Static config for field "${field}" on definition "${definition.name}" is not marked static.`,
        );
      }
      if (!schemaPathExists(ownSchema, field)) {
        throw new DocumentError(
          'schema',
          `Static config for field "${field}" on definition "${definition.name}" refers to a field that no longer exists. Update or remove this config.`,
        );
      }
      if (config.value !== undefined) {
        validateRecord(
          { [field]: config.value },
          ownSchema,
          `static config on definition "${definition.name}"`,
        );
      }
    }
    for (const [instanceUuid, fieldConfigs] of Object.entries(
      definition.config?.instanceFieldConfigs ?? {},
    )) {
      const node = findDefinitionInstance(definition.root, instanceUuid);
      const target = node?.config?.definitionRef
        ? findDefinition(catalog, node.config.definitionRef)?.definition
        : undefined;
      const targetSchema = target ? inheritableSchemaForDefinition(catalog, target) : null;
      if (!target) {
        throw new DocumentError(
          'schema',
          `Static field config requires a definition instance (${instanceUuid})`,
        );
      }
      const instanceName = node?.name ?? instanceUuid;
      for (const [field, config] of Object.entries(fieldConfigs)) {
        if (!config.isStatic) {
          throw new DocumentError(
            'schema',
            `Static config for field "${field}" on instance "${instanceName}" is not marked static.`,
          );
        }
        if (!schemaPathExists(targetSchema, field)) {
          throw new DocumentError(
            'schema',
            `Static config for field "${field}" on instance "${instanceName}" of "${target.name}" in "${definition.name}" refers to a field that no longer exists. Update or remove this config.`,
          );
        }
        if (config.value !== undefined) {
          validateRecord(
            { [field]: config.value },
            targetSchema,
            `static config on instance "${instanceName}" of "${target.name}" in "${definition.name}"`,
          );
        }
      }
    }
    for (const [nodeUuid, exposure] of Object.entries(definition.config?.fieldExposure ?? {})) {
      const node = findDefinitionInstance(definition.root, nodeUuid);
      const target = node?.config?.definitionRef
        ? findDefinition(catalog, node.config.definitionRef)?.definition
        : undefined;
      if (!target) {
        throw new DocumentError(
          'schema',
          `Field exposure requires a definition instance (${nodeUuid})`,
        );
      }
      if (exposure.mode === 'manual') {
        const targetSchema = inheritableSchemaForDefinition(catalog, target);
        for (const sourcePath of Object.keys(exposure.fields)) {
          if (!schemaPathExists(targetSchema, sourcePath)) {
            throw new DocumentError(
              'schema',
              `Unknown exposed field "${sourcePath}" on instance "${node?.name ?? nodeUuid}"`,
            );
          }
        }
      }
    }
    validateRecord(
      definition.config?.previewData?.fields,
      effective.schema,
      `preview defaults for "${definition.name}"`,
    );
    const visit = (node: (typeof definition)['root']) => {
      const ref = node.config?.definitionRef;
      const target = ref ? findDefinition(catalog, ref)?.definition : undefined;
      if (target) {
        const targetSchema = effectiveSchemaForDefinition(catalog, target).schema;
        validateRecord(node.data, targetSchema, `instance "${node.name ?? node.uuid}"`);
        validateRecord(
          node.config?.previewData?.fields,
          targetSchema,
          `instance preview values for "${node.name ?? node.uuid}"`,
        );
        return;
      }
      for (const child of node.dom.children ?? []) visit(child);
    };
    visit(definition.root);
  }
}

function schemaAtPath(schema: Record<string, unknown> | null, path: string) {
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

function asSchemaRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isEnumSchema(schema: Record<string, unknown> | null) {
  if (!schema) return false;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return true;
  if (!Array.isArray(schema.oneOf) || schema.oneOf.length === 0) return false;
  return schema.oneOf.every((branch) => {
    if (!branch || typeof branch !== 'object' || Array.isArray(branch)) return false;
    const discriminator = (branch as Record<string, unknown>).properties;
    if (!discriminator || typeof discriminator !== 'object' || Array.isArray(discriminator)) {
      return false;
    }
    const valueSchema = (discriminator as Record<string, unknown>).type;
    if (!valueSchema || typeof valueSchema !== 'object' || Array.isArray(valueSchema)) return false;
    const values = valueSchema as Record<string, unknown>;
    return Object.hasOwn(values, 'const') || (Array.isArray(values.enum) && values.enum.length > 0);
  });
}

function enumValues(schema: Record<string, unknown> | null): string[] {
  if (!schema) return [];
  if (Array.isArray(schema.enum)) {
    return schema.enum.filter((value): value is string => typeof value === 'string');
  }
  if (!Array.isArray(schema.oneOf)) return [];
  return schema.oneOf.flatMap((branch) => {
    if (!branch || typeof branch !== 'object' || Array.isArray(branch)) return [];
    const properties = (branch as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object' || Array.isArray(properties)) return [];
    const type = (properties as Record<string, unknown>).type;
    if (!type || typeof type !== 'object' || Array.isArray(type)) return [];
    const valueSchema = type as Record<string, unknown>;
    const constant = valueSchema.const;
    if (typeof constant === 'string') return [constant];
    return Array.isArray(valueSchema.enum)
      ? valueSchema.enum.filter((value): value is string => typeof value === 'string')
      : [];
  });
}

function findDefinitionInstance(root: Node, uuid: string): Node | null {
  if (root.uuid === uuid) return root.config?.definitionRef ? root : null;
  if (root.config?.definitionRef) return null;
  for (const child of root.dom.children ?? []) {
    const found = findDefinitionInstance(child, uuid);
    if (found) return found;
  }
  return null;
}

/** Ensure schema refs and definitionRef targets exist in the catalog. */
export function assertCatalogRefIntegrity(catalog: ProjectCatalog): void {
  const schemaIds = new Set(Object.keys(catalog.schemas ?? {}));
  const definitionIds = new Set<string>([
    ...Object.keys(catalog.atoms),
    ...Object.keys(catalog.components),
    ...Object.keys(catalog.pages),
  ]);
  const definitions = listCatalogDefinitions(catalog).map(({ definition }) => definition);
  for (const [id, schema] of Object.entries(catalog.schemas ?? {})) {
    assertReferenceSchema(schema, catalog, `schema ${id}`);
  }
  for (const definition of definitions) {
    const schema = resolveJsonSchemaForDefinition(catalog, definition);
    if (schema) assertReferenceSchema(schema, catalog, `definition ${definition.name}`);
  }

  const visitNode = (node: {
    config?: { definitionRef?: string };
    dom: { children?: readonly unknown[] };
  }) => {
    const ref = node.config?.definitionRef;
    if (ref && !definitionIds.has(ref)) {
      throw new DocumentError('schema', `Unknown definitionRef "${ref}"`);
    }
    for (const child of node.dom.children ?? []) {
      visitNode(child as typeof node);
    }
  };

  const checkSchemaSource = (source: { kind: string; uuid?: string }, context: string) => {
    if (source.kind === 'ref') {
      const id = source.uuid;
      if (!id || !schemaIds.has(id)) {
        throw new DocumentError('schema', `Missing schema ref ${id ?? '?'} (${context})`);
      }
    }
  };

  for (const [id, def] of Object.entries(catalog.atoms)) {
    checkSchemaSource(def.schema, `atom ${id}`);
    visitNode(def.root);
  }
  for (const [id, def] of Object.entries(catalog.components)) {
    checkSchemaSource(def.schema, `component ${id}`);
    visitNode(def.root);
  }
  for (const [id, def] of Object.entries(catalog.pages)) {
    checkSchemaSource(def.schema, `page ${id}`);
    visitNode(def.root);
  }
  assertDefinitionRefsAcyclic(catalog);
}

function assertReferenceSchema(schema: unknown, catalog: ProjectCatalog, context: string): void {
  if (Array.isArray(schema)) {
    schema.forEach((entry) => assertReferenceSchema(entry, catalog, context));
    return;
  }
  if (!schema || typeof schema !== 'object') return;
  const record = schema as Record<string, unknown>;
  if (
    Object.hasOwn(record, 'x-facadeur-reference') &&
    (!record['x-facadeur-reference'] ||
      typeof record['x-facadeur-reference'] !== 'object' ||
      !('target' in record['x-facadeur-reference']) ||
      typeof (record['x-facadeur-reference'] as Record<string, unknown>).target !== 'string' ||
      !(record['x-facadeur-reference'] as Record<string, unknown>).target)
  ) {
    throw new DocumentError('schema', `Invalid catalog reference annotation (${context})`);
  }
  const reference = record['x-facadeur-reference'];
  if (reference && typeof reference === 'object' && 'target' in reference) {
    const target = String((reference as Record<string, unknown>).target);
    if (target !== 'icon' && target !== 'component') {
      throw new DocumentError(
        'schema',
        `Unknown catalog reference target "${target}" (${context})`,
      );
    }
    const defaultValue = record.default;
    if (defaultValue !== undefined) {
      const valid =
        typeof defaultValue === 'string' &&
        (target === 'icon'
          ? catalog.icons?.some((icon) => icon.id === defaultValue)
          : Object.hasOwn(catalog.components, defaultValue));
      if (!valid) {
        throw new DocumentError(
          'schema',
          `Unknown ${target} reference default "${defaultValue}" (${context})`,
        );
      }
    }
  }
  for (const value of Object.values(record)) assertReferenceSchema(value, catalog, context);
}

function assertCatalogReferenceValue(
  value: unknown,
  schema: unknown,
  catalog: ProjectCatalog,
  context: string,
): void {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return;
  const record = schema as Record<string, unknown>;
  const reference = record['x-facadeur-reference'];
  if (reference && typeof reference === 'object' && 'target' in reference) {
    const target = String((reference as Record<string, unknown>).target);
    if (target === 'icon' && value !== undefined) {
      if (typeof value === 'string' && /^\{(?:prop|props):[^}]+\}$/.test(value)) return;
      if (typeof value !== 'string' || !catalog.icons?.some((icon) => icon.id === value)) {
        throw new DocumentError('schema', `Unknown icon reference "${String(value)}" (${context})`);
      }
    }
    if (target === 'component' && value !== undefined) {
      if (typeof value === 'string' && /^\{(?:prop|props|item):[^}]+\}$/.test(value)) return;
      if (typeof value !== 'string' || !Object.hasOwn(catalog.components, value)) {
        throw new DocumentError(
          'schema',
          `Unknown component reference "${String(value)}" (${context})`,
        );
      }
    }
  }
  const properties = record.properties;
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    properties &&
    typeof properties === 'object'
  ) {
    for (const [name, childSchema] of Object.entries(properties)) {
      assertCatalogReferenceValue(
        (value as Record<string, unknown>)[name],
        childSchema,
        catalog,
        `${context}.${name}`,
      );
    }
  }
  if (Array.isArray(value) && record.items) {
    value.forEach((entry, index) =>
      assertCatalogReferenceValue(entry, record.items, catalog, `${context}[${index}]`),
    );
  }
}

function assertDefinitionRefsAcyclic(catalog: ProjectCatalog) {
  const definitions = new Map([
    ...Object.entries(catalog.atoms),
    ...Object.entries(catalog.components),
    ...Object.entries(catalog.pages),
  ]);
  const complete = new Set<string>();
  const active = new Set<string>();
  const visitDefinition = (uuid: string) => {
    if (active.has(uuid)) {
      throw new DocumentError('schema', `Cyclic catalog definition reference at "${uuid}"`);
    }
    if (complete.has(uuid)) return;
    active.add(uuid);
    const definition = definitions.get(uuid);
    const visitNode = (node: {
      config?: { definitionRef?: string };
      dom: { children?: readonly unknown[] };
    }) => {
      if (node.config?.definitionRef) visitDefinition(node.config.definitionRef);
      for (const child of node.dom.children ?? []) visitNode(child as typeof node);
    };
    if (definition) visitNode(definition.root);
    active.delete(uuid);
    complete.add(uuid);
  };
  for (const uuid of definitions.keys()) visitDefinition(uuid);
}

export function emptyProjectCatalog(): ProjectCatalog {
  return { atoms: {}, components: {}, pages: {} };
}
