import { Value } from '@sinclair/typebox/value';
import { DocumentError } from '../../../document/errors';
import { projectCatalogSchema, type ProjectCatalogModel } from '../../../schema/node-model/index';
import { sanitizeProjectCatalog } from './sanitize-field-values';
import { findDefinition } from './ops';
import { effectiveSchemaForDefinition } from './field-contract';
import { matchesSchemaValue } from '../../validation/json-schema-value';
import { ensureCatalogFieldIds } from './field-ids';

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

export function validateProjectCatalog(data: unknown): ProjectCatalogModel {
  const sanitized =
    data && typeof data === 'object' ? sanitizeProjectCatalog(data as ProjectCatalogModel) : data;
  const catalog =
    sanitized && typeof sanitized === 'object'
      ? ensureCatalogFieldIds(sanitized as ProjectCatalogModel).catalog
      : sanitized;

  try {
    if (!Value.Check(projectCatalogSchema, catalog)) {
      throw new DocumentError('schema', catalogSchemaErrorMessage(catalog));
    }
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError('schema', catalogSchemaErrorMessage(catalog));
  }

  assertCatalogRefIntegrity(catalog as ProjectCatalogModel);
  assertEffectiveCatalogFields(catalog as ProjectCatalogModel);
  return catalog as ProjectCatalogModel;
}

function assertEffectiveCatalogFields(catalog: ProjectCatalogModel) {
  const definitions = [
    ...Object.values(catalog.atoms),
    ...Object.values(catalog.components),
    ...Object.values(catalog.pages),
  ];
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
      if (
        !matchesSchemaValue(
          value,
          optionalizeRequired(fieldSchema) as Parameters<typeof matchesSchemaValue>[1],
        ) &&
        !isFieldBindingValue(value, fieldSchema)
      ) {
        throw new DocumentError('schema', `Invalid value for field "${field}" in ${context}`);
      }
    }
  };

  for (const definition of definitions) {
    const effective = effectiveSchemaForDefinition(catalog, definition);
    const definitionExposure = definition.config?.fieldExposure;
    if (definitionExposure?.mode === 'manual') {
      for (const sourcePath of Object.keys(definitionExposure.fields)) {
        if (!schemaPathExists(effective.schema, sourcePath)) {
          throw new DocumentError(
            'schema',
            `Unknown default exposed field "${sourcePath}" on "${definition.name}"`,
          );
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
      if (!ref && node.config?.fieldExposure) {
        throw new DocumentError(
          'schema',
          `Field exposure requires a definition instance (${node.uuid})`,
        );
      }
      if (target) {
        const targetSchema = effectiveSchemaForDefinition(catalog, target).schema;
        const exposure = node.config?.fieldExposure ?? target.config?.fieldExposure;
        if (exposure?.mode === 'manual') {
          for (const sourcePath of Object.keys(exposure.fields)) {
            if (!schemaPathExists(targetSchema, sourcePath)) {
              throw new DocumentError(
                'schema',
                `Unknown exposed field "${sourcePath}" on instance "${node.name ?? node.uuid}"`,
              );
            }
          }
        }
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

function isFieldBindingValue(value: unknown, schema: unknown) {
  if (typeof value !== 'string') return false;
  const fieldSchema =
    schema && typeof schema === 'object' ? (schema as Record<string, unknown>) : {};
  if (
    fieldSchema.type === 'string' ||
    (Array.isArray(fieldSchema.type) && fieldSchema.type.includes('string'))
  ) {
    return false;
  }
  return (
    /^\{prop:[^}]+\}$/.test(value) ||
    /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)+$/.test(value)
  );
}

function optionalizeRequired(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(optionalizeRequired);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'required') continue;
    result[key] = optionalizeRequired(entry);
  }
  return result;
}

function schemaPathExists(schema: Record<string, unknown> | null, path: string) {
  let current: unknown = schema;
  for (const segment of path.split('.')) {
    if (!current || typeof current !== 'object') return false;
    const properties = (current as Record<string, unknown>).properties;
    if (!properties || typeof properties !== 'object' || !(segment in properties)) return false;
    current = (properties as Record<string, unknown>)[segment];
  }
  return true;
}

/** Ensure schema refs and definitionRef targets exist in the catalog. */
export function assertCatalogRefIntegrity(catalog: ProjectCatalogModel): void {
  const schemaIds = new Set(Object.keys(catalog.schemas ?? {}));
  const definitionIds = new Set<string>([
    ...Object.keys(catalog.atoms),
    ...Object.keys(catalog.components),
    ...Object.keys(catalog.pages),
  ]);

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

function assertDefinitionRefsAcyclic(catalog: ProjectCatalogModel) {
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

export function emptyProjectCatalog(): ProjectCatalogModel {
  return { atoms: {}, components: {}, pages: {} };
}
