import type { JsonSchema, LibrarySchema } from './schema-library.js';

export interface SchemaValidationIssue {
  schemaId: string;
  message: string;
}

const SCHEMA_REF_PREFIX = 'facadeur://schema/';
const VALID_TYPES = new Set(['null', 'boolean', 'object', 'array', 'number', 'integer', 'string']);

/** Stable, JSON-Schema-compatible identifier used by schema-library compositions. */
export function schemaRefUri(schemaId: string): string {
  return `${SCHEMA_REF_PREFIX}${encodeURIComponent(schemaId)}`;
}

function schemaIdFromRef(ref: string): string | null {
  if (!ref.startsWith(SCHEMA_REF_PREFIX)) return null;
  try {
    const id = decodeURIComponent(ref.slice(SCHEMA_REF_PREFIX.length));
    return id.length > 0 && schemaRefUri(id) === ref ? id : null;
  } catch {
    return null;
  }
}

/**
 * Validate all stored contracts as a graph. Calling this after every schema edit ensures a
 * dependency change is checked against every schema that composes it.
 */
export function validateLibrarySchemas(schemas: LibrarySchema[]): SchemaValidationIssue[] {
  const byId = new Map(schemas.map((entry) => [entry.id, entry]));
  const issues: SchemaValidationIssue[] = [];
  const issueKeys = new Set<string>();
  const add = (schemaId: string, message: string) => {
    const key = `${schemaId}\0${message}`;
    if (!issueKeys.has(key)) {
      issueKeys.add(key);
      issues.push({ schemaId, message });
    }
  };

  for (const entry of schemas) {
    const references = new Set<string>();
    inspectSchema(entry.schema, entry.id, '$', add, references);
    for (const refId of references) {
      if (!byId.has(refId)) add(entry.id, `Schema reference “${refId}” does not exist.`);
    }
  }

  for (const entry of schemas) {
    const effective = resolveLibrarySchema(entry.id, schemas);
    if (effective) {
      validateAllOfIntersections(effective, entry.id, '$', add);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (schemaId: string, chain: string[]) => {
    if (visiting.has(schemaId)) {
      const cycle = [...chain, schemaId].join(' → ');
      add(schemaId, `Schema composition contains a cycle: ${cycle}.`);
      return;
    }
    if (visited.has(schemaId)) return;
    visiting.add(schemaId);
    const entry = byId.get(schemaId);
    if (entry) {
      for (const refId of collectRefs(entry.schema)) {
        if (byId.has(refId)) visit(refId, [...chain, schemaId]);
      }
    }
    visiting.delete(schemaId);
    visited.add(schemaId);
  };
  for (const schema of schemas) visit(schema.id, []);
  return issues;
}

function validateAllOfIntersections(
  schema: JsonSchema,
  ownerId: string,
  path: string,
  add: (schemaId: string, message: string) => void,
): void {
  const branches: JsonSchema[] = [];
  const flatten = (branch: JsonSchema) => {
    branches.push(branch);
    for (const child of branch.allOf ?? []) flatten(child);
  };
  flatten(schema);
  const typeConstraints = branches.flatMap((branch) =>
    branch.type === undefined
      ? []
      : [new Set(Array.isArray(branch.type) ? branch.type : [branch.type])],
  );
  const firstTypeConstraint = typeConstraints[0];
  if (firstTypeConstraint && typeConstraints.length > 1) {
    const possibleTypes = typeConstraints
      .slice(1)
      .reduce(
        (possible, constraint) => new Set([...possible].filter((type) => constraint.has(type))),
        new Set(firstTypeConstraint),
      );
    if (possibleTypes.size === 0) {
      add(ownerId, `${path}: the allOf schemas have incompatible type constraints.`);
    }
  }
  const enumConstraints = branches.flatMap((branch) => (branch.enum ? [branch.enum] : []));
  if (enumConstraints.length > 1) {
    const possibleValues = enumConstraints
      .slice(1)
      .reduce(
        (possible, values) =>
          new Set(
            [...possible].filter((value) => values.some((item) => JSON.stringify(item) === value)),
          ),
        new Set((enumConstraints[0] ?? []).map((value) => JSON.stringify(value))),
      );
    if (possibleValues.size === 0) {
      add(ownerId, `${path}: the allOf schemas have no common enum values.`);
    }
  }
  const propertyNames = new Set(branches.flatMap((branch) => Object.keys(branch.properties ?? {})));
  for (const name of propertyNames) {
    const properties = branches.flatMap((branch) =>
      branch.properties?.[name] ? [branch.properties[name]] : [],
    );
    if (properties.length > 1) {
      validateAllOfIntersections(
        { allOf: properties as JsonSchema[] },
        ownerId,
        `${path}.properties.${name}`,
        add,
      );
    }
  }
}

function inspectSchema(
  schema: JsonSchema,
  ownerId: string,
  path: string,
  add: (schemaId: string, message: string) => void,
  references: Set<string>,
): void {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    add(ownerId, `${path} must be a schema object.`);
    return;
  }
  if (schema.$ref !== undefined) {
    if (typeof schema.$ref !== 'string' || schemaIdFromRef(schema.$ref) === null) {
      add(ownerId, `${path} uses an unsupported schema reference.`);
    } else {
      references.add(schemaIdFromRef(schema.$ref)!);
    }
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (types.length === 0 || types.some((type) => !VALID_TYPES.has(type))) {
      add(ownerId, `${path}.type contains an unsupported JSON Schema type.`);
    }
  }
  for (const keyword of ['allOf', 'oneOf', 'anyOf'] as const) {
    const branches = schema[keyword];
    if (branches !== undefined) {
      if (!Array.isArray(branches) || branches.length === 0) {
        add(ownerId, `${path}.${keyword} must contain at least one schema.`);
      } else {
        branches.forEach((branch, index) =>
          inspectSchema(branch, ownerId, `${path}.${keyword}[${index}]`, add, references),
        );
      }
    }
  }
  if (schema.properties !== undefined) {
    if (
      !schema.properties ||
      typeof schema.properties !== 'object' ||
      Array.isArray(schema.properties)
    ) {
      add(ownerId, `${path}.properties must be an object.`);
    } else {
      for (const [name, property] of Object.entries(schema.properties)) {
        inspectSchema(property, ownerId, `${path}.properties.${name}`, add, references);
      }
    }
  }
  if (schema.items !== undefined)
    inspectSchema(schema.items, ownerId, `${path}.items`, add, references);
  if (
    schema.additionalProperties !== undefined &&
    typeof schema.additionalProperties !== 'boolean'
  ) {
    inspectSchema(
      schema.additionalProperties,
      ownerId,
      `${path}.additionalProperties`,
      add,
      references,
    );
  }
  if (
    schema.required !== undefined &&
    (!Array.isArray(schema.required) || schema.required.some((name) => typeof name !== 'string'))
  ) {
    add(ownerId, `${path}.required must be an array of property names.`);
  }
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length === 0)) {
    add(ownerId, `${path}.enum must contain at least one value.`);
  }
}

function collectRefs(schema: JsonSchema): string[] {
  const refs: string[] = [];
  const walk = (node: JsonSchema) => {
    if (node.$ref) {
      const id = schemaIdFromRef(node.$ref);
      if (id) refs.push(id);
    }
    for (const child of Object.values(node.properties ?? {})) walk(child);
    if (node.items) walk(node.items);
    if (node.additionalProperties && typeof node.additionalProperties === 'object')
      walk(node.additionalProperties);
    for (const keyword of ['allOf', 'oneOf', 'anyOf'] as const) {
      for (const child of node[keyword] ?? []) walk(child);
    }
  };
  walk(schema);
  return refs;
}

/** Resolve library references for consumers that need to inspect the effective schema. */
export function resolveLibrarySchema(
  schemaId: string,
  schemas: LibrarySchema[],
): JsonSchema | null {
  const byId = new Map(schemas.map((entry) => [entry.id, entry]));
  const resolve = (schema: JsonSchema, stack: Set<string>, referencedRoot = false): JsonSchema => {
    if (schema.$ref) {
      const refId = schemaIdFromRef(schema.$ref);
      if (!refId || stack.has(refId)) return {};
      const referenced = byId.get(refId);
      if (!referenced) return {};
      const nextStack = new Set(stack).add(refId);
      return resolve(referenced.schema, nextStack, true);
    }
    const result: JsonSchema = { ...schema };
    delete result.$ref;
    if (referencedRoot) delete result.additionalProperties;
    if (result.properties) {
      result.properties = Object.fromEntries(
        Object.entries(result.properties).map(([name, child]) => [name, resolve(child, stack)]),
      );
    }
    if (result.items) result.items = resolve(result.items, stack);
    for (const keyword of ['allOf', 'oneOf', 'anyOf'] as const) {
      if (result[keyword]) result[keyword] = result[keyword]!.map((child) => resolve(child, stack));
    }
    return result;
  };
  const entry = byId.get(schemaId);
  return entry ? resolve(entry.schema, new Set([schemaId])) : null;
}
